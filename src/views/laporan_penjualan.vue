

<template>
  <div class="app-container">
   
    <el-date-picker v-model="start" class="filter-item" style="margin-right:8px; margin-bottom:10px" type="date" format="dd-MM-yyyy" placeholder="Dari">
    </el-date-picker>
    <el-date-picker v-model="end" style="margin-bottom:10px; margin-right:10px" class="filter-item" type="date" format="dd-MM-yyyy" placeholder="Sampai">
    </el-date-picker>
    <el-button class="filter-item" style="" type="primary" icon="el-icon-edit" @click="filterReportByDate">
        Filter
    </el-button>  
     <el-button class="filter-item" type="primary" icon="el-icon-download" @click="handleDownload">
            Export
      </el-button>

       <el-button v-print="'#printMe'" class="filter-item" type="primary" icon="el-icon-print">
            Print
      </el-button>

    <div id="printMe">
    <GChart
      type="PieChart"
      style="position:relative; left:-240px"
      :options="options"
      :data="data"
    />  

    <h3 style="margin-left:20px">Total Penjualan : {{handleCurrency(total_penjualan)}}</h3>
    <h3 style="margin-left:20px">Produk Terjual : {{total_produk}}</h3>
      
    <el-table
     
      :data="list"
      
    >
     <el-table-column label="ID" prop="id"  align="center" width="80"  >
        <template slot-scope="{row}">
          <span>{{ row.id }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Nama" min-width="150px">
        <template slot-scope="{row}">
          <span class="link-type">{{ row.name }}</span>
        </template>
      </el-table-column>  
      <el-table-column label="Total Penjualan" min-width="150px">
        <template slot-scope="{row}">
          <span >{{handleCurrency(row.substocktransaction_sum_total) }}</span>
        </template>
      </el-table-column> 
      <el-table-column label="Total Barang" min-width="150px">
        <template slot-scope="{row}">
          <span >{{ row.substocktransaction_sum_qty }}</span>
        </template>
      </el-table-column>     
    </el-table>
    </div>


  </div>
</template>
<script>
import { GChart } from "vue-google-charts";
import axios from '@/api/axios'

export default {
  name: "App",
  components: {
    GChart
  },

  created(){
    axios.get('/stock/out/report').then(response => {
      this.list = response.data.stocktransaction
      console.log(response)
      let total = 0
      let total_produk = 0
      response.data.stocktransaction.map((val) => {
        this.data.push([val.name, val.substocktransaction_sum_total])
        total += val.substocktransaction_sum_total
        total_produk += val.substocktransaction_sum_qty
      })
      this.total_penjualan = total
      this.total_produk = total_produk
      
    })
  },

  methods : {
    handleDownload() {
        this.downloadLoading = true
        import('@/vendor/Export2Excel').then(excel => {
            const tHeader = ['id', 'Customer', 'Total Barang', 'Total Penjualan']
            const filterVal = ['id', 'name', 'substocktransaction_sum_qty', 'substocktransaction_sum_total']
            const data = this.formatJson(filterVal)
            excel.export_json_to_excel({
                header: tHeader,
                data,
                filename: 'laporan_penjualan'
            })
            this.downloadLoading = false
        })
    },

     formatJson(filterVal) {
            return this.list.map(v => filterVal.map(j => {
                return v[j]
            }))
        },

    filterReportByDate(){
      this.listLoading = true
      let data = {
        start_date: this.start.toISOString().split('T')[0],
        end_date: this.end.toISOString().split('T')[0]
      }
      axios.post(`/stock/out/report`, data).then(response => {
          console.log(response)
          this.data = [['laporan', 'penjualan']]
          let total = 0
          let total_produk = 0
          response.data.stocktransaction.map((val) => {
            this.data.push([val.name, val.substocktransaction_sum_total])
            total += val.substocktransaction_sum_total
            total_produk += val.substocktransaction_sum_qty
          })
          this.total_penjualan = total
          this.total_produk = total_produk
          console.log(this.data)
          this.list = response.data.stocktransaction

          // Just to simulate the time of the request
          setTimeout(() => {
              this.listLoading = false
          }, 1.5 * 1000)
      })
    },

    handleCurrency(number) {
            const idr = new Intl.NumberFormat('in-IN', {
                style: 'currency',
                currency: 'IDR'
            }).format(number)
            return idr
        },
  },

  data() {
    return {
      start : '',
      end : '',
      total_penjualan : '',
      total_produk : '',
      list : '',
      data: [['laporan', 'penjualan']],
      options: {
        width: 1100,
        height: 400
      }
    };
  }
};
</script>