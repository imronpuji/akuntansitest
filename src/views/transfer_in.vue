<template>

  <div class="app-container">
     <div class="filter-container">
      <el-input v-model="search" placeholder="Cari" style="width: 200px;margin-right: 10px;" class="filter-item" />

        <el-button v-if="roles == 'admin'" class="filter-item" style="" type="primary" icon="el-icon-edit" @click="handleCreate">
            Tambah
        </el-button>
        <el-button v-waves style="margin-right:20px; " :loading="downloadLoading" class="filter-item" type="primary" icon="el-icon-download" @click="handleDownload">
            Export
        </el-button>
          <el-date-picker style="width:140px" width="140px" v-model="start" class="filter-item" type="date" placeholder="Dari">
        </el-date-picker>
        <el-date-picker style="margin-left:8px;width:140px;margin-right: 10px;"  v-model="end" class="filter-item" type="date" placeholder="Sampai">
        </el-date-picker>
        <el-button class="filter-item" style="" type="primary" icon="el-icon-edit" @click="handleFilterByDate">
            Filter
        </el-button>
    </div>

    <el-table
      :key="tableKey"
      v-loading="listLoading"
      :data="list.filter(({desc}) => !search || desc.toLowerCase().includes(search.toLowerCase()))"

      border
      fit
      highlight-current-row
      style="width: 100%;"
      @sort-change="sortChange"
    >
      <el-table-column label="ID" prop="id" sortable="custom" align="center" width="80" :class-name="getSortClass('id')">
        <template slot-scope="{row}">
          <span>{{ row.id }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Dari Akun Kas" width="150px" align="center">
        <template slot-scope="{row}">
          <span>{{ row.from.name }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Ke Akun Kas" min-width="150px">
        <template slot-scope="{row}">
          <span>{{ row.to.name }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Keterangan" width="150px" align="center">
        <template slot-scope="{row}">
          <span>{{ row.desc }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Total" width="150px" align="center">
        <template slot-scope="{row}">
          <span>{{ handleCurrency(row.transfer) }}</span>
        </template>
      </el-table-column>
       <el-table-column label="Staff" min-width="150px">
        <template slot-scope="{row}">
          <span @click="handleUpdate(row)">{{ row.staff }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Date" width="150px" align="center">
        <template slot-scope="{row}">
          <span>{{ row.date }}</span>
        </template>
      </el-table-column>

      </el-table-column>
      <el-table-column v-if="roles == 'admin'" label="Actions" align="center" width="230" class-name="small-padding fixed-width">
        <template slot-scope="{row,$index}">
          <el-button :loading="loading" type="danger" size="mini" @click="handleDelete(row, $index)">
            Delete
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total>0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="getList" />

     <el-dialog :title="textMap[dialogStatus]" :visible.sync="dialogFormVisible">
      <el-form label-position="top"
:inline="true" ref="dataForm" :rules="rules" :model="temp" label-width="180px" style="width: 100%; margin-left:50px;">
        <el-form-item class="k" label="Dari Kas">
          <el-select v-model="from" required class="filter-item" placeholder="Please select" @change="onChangeModal($event)">
            <el-option v-for="item in cash" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item class="k" label="Ke Kas">
          <el-select v-model="to_item" required class="filter-item" placeholder="Please select" @change="onChangeModal($event)">
            <el-option v-for="item in cash" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item class="k" label="Keterangan">
          <el-input v-model="keterangan" required type="text" placeholder="Please input" />
        </el-form-item>
        <el-form-item class="k" label="Sub Total">
          <v-money-spinner v-model="total_transfer" placeholder="Rp 0"  v-bind="config" @change="onChangeTotal(value)"></v-money-spinner>
        </el-form-item>
              <el-form-item class="k" label="Tgl Transaksi">
      <el-date-picker
        v-model="dates"
        type="date"
        format="dd-MM-yyyy"
        placeholder="Tanggal Transaksi">
      </el-date-picker>
    </el-form-item>
      </el-form>
      <!-- multiple input -->
      <div slot="footer" class="dialog-footer" style="display:flex; justify-content:center;   ">
        <el-button @click="dialogFormVisible = false">
          Cancel
        </el-button>
        <el-button :loading="loading" type="primary" @click="createData()">
          Confirm
        </el-button>
      </div>
    </el-dialog>

    <el-dialog :visible.sync="dialogPvVisible" title="Reading statistics">
      <el-table :data="pvData" border fit highlight-current-row style="width: 100%">
        <el-table-column prop="key" label="Channel" />
        <el-table-column prop="pv" label="Pv" />
      </el-table>
      <span slot="footer" class="dialog-footer">
        <el-button type="primary" @click="dialogPvVisible = false">Confirm</el-button>
      </span>
    </el-dialog>
  </div>
</template>
  <style type="text/css">
    .el_dialog {
      background: blue!important;
    }
  </style>
<script>
import { fetchList, fetchPv, createArticle, updateArticle } from '@/api/article'
import waves from '@/directive/waves' // waves directive
import { parseTime } from '@/utils'
import Pagination from '@/components/Pagination' // secondary package based on el-pagination
import axios from '@/api/axios'
import qs from 'qs'
import { mapGetters } from 'vuex'


const calendarTypeOptions = [
  { key: 'cash', display_name: 'cash' },
  { key: 'modal', display_name: 'modal' }
]

// arr to obj, such as { CN : "China", US : "USA" }
const calendarTypeKeyValue = calendarTypeOptions.reduce((acc, cur) => {
  acc[cur.key] = cur.display_name
  return acc
}, {})

export default {
  name: 'ComplexTable',
  components: { Pagination },
  directives: { waves },
  filters: {
    statusFilter(status) {
      const statusMap = {
        published: 'success',
        draft: 'info',
        deleted: 'danger'
      }
      return statusMap[status]
    },
    typeFilter(type) {
      return calendarTypeKeyValue[type]
    }
  },
    computed: {
    ...mapGetters([
      'name',
      'avatar',
      'roles'
    ])
  },
  data() {
    return {
      start : '',
      end : '',
      dates : '',
      search : '',
      config: {
          spinner: false,
          step: 10,
          prefix: "Rp ",
          precision: 0,
          decimal: ',',
          thousands: '.',
          bootstrap: true,
          amend: false,
          masked: false,
          allowBlank : true
        },
      from: '',
      to_item: '',
      total_kasIn: '',
      keterangan : '',
      total_transfer:[],
      kasIn: {
        all: [{ modal: '', total: '', desc: '' }]
      },
      tableKey: 0,
      list: null,
      total: 0,
      listLoading: true,
      listQuery: {
        page: 1,
        limit: 20,
        importance: undefined,
        title: undefined,
        type: undefined,
        sort: '+id'
      },
      importanceOptions: [1, 2, 3],
      calendarTypeOptions,
      cash: [],
      modal: [],
      sortOptions: [{ label: 'ID Ascending', key: '+id' }, { label: 'ID Descending', key: '-id' }],
      statusOptions: ['published', 'draft', 'deleted'],
      showReviewer: false,
      temp: {
        id: undefined,
        desc: '',
        date: '',
        timestamp: new Date(),
        from: '',
        to: '',
        chasin: ''
      },
      dialogFormVisible: false,
      dialogStatus: '',
      textMap: {
        update: 'Edit',
        create: 'Transfer Kas'
      },
      dialogPvVisible: false,
      pvData: [],
      loading : false,
      rules: {
        type: [{ required: true, message: 'type is required', trigger: 'change' }],
        // timestamp: [{ type: 'date', required: true, message: 'timestamp is required', trigger: 'change' }],
        title: [{ required: true, message: 'title is required', trigger: 'blur' }]
      },
      downloadLoading: false
    }
  },
  created() {
            this.$store.dispatch('user/isLicenceActived')

    this.getList()
  },
  methods: {
        handleFilterByDate(){
   this.listLoading = true
   let data = {
    start_date : this.start,
    end_date : this.end
   }
      axios.post(`/cash/transfer`, data).then(response => {
        console.log(response)
        this.list = response.data.cashtransaction
        this.total = response.data.cashtransaction.length

        // Just to simulate the time of the request
        setTimeout(() => {
          this.listLoading = false
        }, 1.5 * 1000)
      })
  },
    getList() {
       let DD = new Date().getDate()
    let MM = new Date().getMonth() + 1
    let YYYY = new Date().getFullYear()

    this.dates = `${YYYY}-${MM}-${DD}`
      this.listLoading = true
      axios.get('/cash/transfer').then(response => {
        console.log(response)
        this.list = response.data.cashtransaction.filter(val=> {
          if(val.from.name == 'Kas Kecil' || val.from.name == 'Kas Besar' || val.to.name == 'Kas Kecil' || val.to.name == 'Kas Besar' && this.roles == 'kasir'){
            return val
          } else {
            if(this.roles == 'admin'){

              return val
            }
          }
        }).sort((a,b) => (a.id < b.id) ? 1 : ((b.id < a.id) ? -1 : 0))
        this.total = response.data.cashtransaction.length

        // Just to simulate the time of the request
        setTimeout(() => {
          this.listLoading = false
        }, 1.5 * 1000)
      })
      axios.get(`/akun/iscash`).then(response => {
          console.log('cash', response)
          this.cash = response.data.akun
      }).catch(() => {
        this.listLoading = false
       this.$notify({
        title: 'Error',
        message: 'Server Error',
        type: 'warning',
        duration: 2000
        })})

      axios.get(`/akun/notcash`).then(response => {
        this.modal = response.data.akun
      })
      .catch(() => {
        this.listLoading = false
           this.$notify({
            title: 'Error',
            message: 'Server Error',
            type: 'warning',
            duration: 2000
          })
      })
    },
    handleCurrency(number){
     const idr = new Intl.NumberFormat('in-IN', { style: 'currency', currency: 'IDR' }).format(number)
     return idr
    },
    handleFilter() {
      this.listQuery.page = 1
      this.getList()
    },
    handleModifyStatus(row, status) {
      this.$message({
        message: '操作Success',
        type: 'success'
      })
      row.status = status
    },
    sortChange(data) {
      const { prop, order } = data
      if (prop === 'id') {
        this.sortByID(order)
      }
    },
    sortByID(order) {
      if (order === 'ascending') {
        this.listQuery.sort = '+id'
      } else {
        this.listQuery.sort = '-id'
      }
      this.handleFilter()
    },
    resetTemp() {
      this.temp = {
        id: undefined,
        importance: 1,
        remark: '',
        timestamp: new Date(),
        title: '',
        status: 'published',
        type: ''
      }
    },
    handleCreate() {
      this.resetTemp()
      this.dialogStatus = 'create'
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    createData() {
      // this.$refs['dataForm'].validate((valid) => {
      //   if (valid) {
      //     this.temp.id = parseInt(Math.random() * 100) + 1024 // mock a id
      //     this.temp.author = 'vue-element-admin'
      //     createArticle(this.temp).then(() => {
      //
      this.loading = true
      const total = []
      const akun_id = []
      this.kasIn.all.map((val, index) => {

        total.push(parseInt(val.total))
        akun_id.push(val.modal)
      })
      const data = {
        from: this.from,
        to: this.to_item,
        date : this.dates,
        desc : this.keterangan,
        total : this.total_transfer,
        staff : this.name
      }

      var encodedValues = qs.stringify(
        data,
        { allowDots: true }
      )
      console.log(encodedValues)
      axios.post('/cash/transfer/create', encodedValues)
        .then((response) => {
      this.loading = false

          this.getList()
          this.dialogFormVisible = false
          this.$notify({
            title: 'Success',
            message: 'Created Successfully',
            type: 'success',
            duration: 2000
          })
          this.kasIn.all = [{ modal: '', desc: '', total: '' }]
        })
        .catch((err) => {
          this.$notify({
                            title: 'Gagal',
                            message: 'Anda Belum Melengkapi Data',
                            type: 'warning',
                            duration: 2000
                        })
        })
      // }
      // })
    },
    handleUpdate(row) {
      this.temp = Object.assign({}, row) // copy obj
      this.temp.timestamp = new Date(this.temp.timestamp)
      this.dialogStatus = 'update'
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    updateData() {
      this.$refs['dataForm'].validate((valid) => {
        if (valid) {
          const tempData = Object.assign({}, this.temp)
          tempData.timestamp = +new Date(tempData.timestamp) // change Thu Nov 30 2017 16:41:05 GMT+0800 (CST) to 1512031311464
          updateArticle(tempData).then(() => {
            const index = this.list.findIndex(v => v.id === this.temp.id)
            this.list.splice(index, 1, this.temp)
            this.dialogFormVisible = false
            this.$notify({
              title: 'Success',
              message: 'Update Successfully',
              type: 'success',
              duration: 2000
            })
          })
        }
      })
    },
    handleDelete(row, index) {
  

         this.listLoading = true

   this.$confirm('Apakah anda serius mau menghapus ?', 'Warning', {
        confirmButtonText: 'OK',
        cancelButtonText: 'Cancel',
        type: 'warning'
    }).then(() => {
    axios.delete(`/cash/transaction/delete/${row.id}`)
   .then((response) => {
    this.listLoading = false
      this.loading = false

    this.$notify({
      title: 'Success',
      message: 'Delete Successfully',
      type: 'success',
      duration: 2000
    })
    this.list.splice(index, 1)
  })
   .catch((err) => {
      this.loading = false

    this.listLoading = false
    this.$notify({
      title: 'Error',
      message: 'Server Error',
      type: 'warning',
      duration: 2000
    })
  })
 }).catch(() => {
      this.loading = false
  
    this.listLoading = false
  this.$message({
    type: 'info',
    message: 'Delete canceled'
  });          
});
    },
    handleFetchPv(pv) {
      fetchPv(pv).then(response => {
        this.pvData = response.data.pvData
        this.dialogPvVisible = true
      })
    },
    handleDownload() {
      this.downloadLoading = true
      import('@/vendor/Export2Excel').then(excel => {
        const tHeader = ['id','Dari Akun Kas', 'Ke Akun Kas', 'Keterangan', 'Total', 'staff']
        const filterVal = ['id','from', 'to', 'desc', 'transfer', 'staff']
        const data = this.formatJson(filterVal)
        excel.export_json_to_excel({
          header: tHeader,
          data,
          filename: 'transfer'
        })
        this.downloadLoading = false
      })
    },
    formatJson(filterVal) {

      return this.list.map((v, i) => filterVal.map((j, index) => {

             return j == 'from' || j == 'to' ? v[j]['name'] : v[j]

          
      }))
    },
    getSortClass: function(key) {
      const sort = this.listQuery.sort
      return sort === `+${key}` ? 'ascending' : 'descending'
    },
    onChangeCash(event) {
      console.log(event)
    },
    onChangeModal(event) {
      console.log(event)
    },
    addFind() {
      this.kasIn.all.push({ modal: '', desc: '', total: '' })

      console.log(this.kasIn, this.to_item, this.from)
    },
    onChangeTotal() {
      const total = this.kasIn.all.reduce(function(accumulator, item) {
        console.log(item.total)
        return accumulator + parseInt(item.total)
      }, 0)
      this.total_kasIn = total
    }

  }
}
</script>
