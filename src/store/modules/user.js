import { login, logout, getInfo } from '@/api/user'
import { getToken, setToken, removeToken } from '@/utils/auth'
import router, { resetRouter } from '@/router'
import axios from '@/api/axios'
import NProgress from 'nprogress'

const state = {
  token: getToken(),
  name: '',
  email: '',
  avatar: '',
  introduction: '',
  roles: []
}

const mutations = {
  SET_TOKEN: (state, token) => {
    state.token = token
  },
  SET_INTRODUCTION: (state, introduction) => {
    state.introduction = introduction
  },
  SET_NAME: (state, name) => {
    state.name = name
  },
  SET_AVATAR: (state, avatar) => {
    state.avatar = avatar
  },
  SET_ROLES: (state, roles) => {
    state.roles = roles
  },
  SET_EMAIL: (state, email) => {
    state.email = email
  },
  SET_ID: (state, id) => {
    state.id = id
  }
}

const actions = {
  // user login
  login({ commit }, userInfo) {
    const { username, password } = userInfo
    return new Promise((resolve, reject) => {
      axios.post('/login', { email: username, password: password }).then(response => {
        console.log(response)
        const { data } = response
        commit('SET_TOKEN', data.token)
        setToken(data.token)
        resolve()
      }).catch(error => {
        console.log(error)
        reject(error)
      })
    })
  },

  // get user info
  getInfo({ commit, state }) {
    return new Promise((resolve, reject) => {
      axios.get('/profile', {
        headers: { Authorization: `Bearer ${state.token}` }
      }).then(response => {
        const { data } = response
        console.log(data)
        if (!data) {
          reject('Verification failed, please Login again.')
        }

        const { roles, name, avatar, introduction, email, id } = data.user[0]

        // roles must be a non-empty array
        const role = roles.map((val) => val.name)

        if (!roles || roles.length <= 0) {
          commit('SET_ROLES', ['user'])
        } else {
          commit('SET_ROLES', role)
        }

        commit('SET_NAME', name)
        commit('SET_ID', id)
        commit('SET_AVATAR', 'https://www.kindpng.com/picc/m/78-786207_user-avatar-png-user-avatar-icon-png-transparent.png')
        commit('SET_EMAIL', email)
        commit('SET_INTRODUCTION', 'introduction')
        resolve({ roles: role, name, avatar: 'https://www.kindpng.com/picc/m/78-786207_user-avatar-png-user-avatar-icon-png-transparent.png', introduction: 'lol' })
      // }).catch(error => {
      //   reject(error)
      // })
      })
    })
  },

  // user logout
  logout({ commit, state, dispatch }) {
    return new Promise((resolve, reject) => {
      NProgress.start()
      axios.get('/logout', {
        headers: { Authorization: `Bearer ${state.token}` }
      }).then(() => {
        commit('SET_TOKEN', '')
        commit('SET_ROLES', [])
        removeToken()
        resetRouter()

        // reset visited views and cached views
        // to fixed https://github.com/PanJiaChen/vue-element-admin/issues/2485
        dispatch('tagsView/delAllViews', null, { root: true })

        resolve()
      }).catch(error => {
        reject(error)
      })
    })
  },

  // check lisensi
  isLicenceActived({ commit, state, dispatch }) {
    axios.get(`/licence`).then(response => {
      if (response.data.licence == null) {
        alert('Masukan Lisensi')
        router.push({ path: '/permission/lisensi' })
      }
      const data = response.data.licence
      axios.get('https://lisensi.ruasdigital.id/api/checking?licence=' + data.licence + '&product_code=' + data.code + '&domain=' + window.location.hostname).then(response => {
        if (response.status == 401) {
          axios.delete('/licence/delete')
          alert('Lisensi Kadaluarsa')
          router.push({ path: '/permission/lisensi' })
        }
      }).catch(err => {
        axios.delete('/licence/delete')
        alert('Lisensi Kadaluarsa')
        router.push({ path: '/permission/lisensi' })
      })
    }).catch(err => {
      if (!err.response.data.success) {
        alert('Lisensi Kadaluarsa')
        router.push({ path: '/permission/lisensi' })
      } else {
        console.log('berhasil')
      }
    })
  },
  // remove token
  resetToken({ commit }) {
    return new Promise(resolve => {
      commit('SET_TOKEN', '')
      commit('SET_ROLES', [])
      removeToken()
      resolve()
    })
  },

  // dynamically modify permissions
  async changeRoles({ commit, dispatch }, role) {
    const token = role + '-token'

    commit('SET_TOKEN', token)
    setToken(token)

    const { roles } = await dispatch('getInfo')

    resetRouter()

    // generate accessible routes map based on roles
    const accessRoutes = await dispatch('permission/generateRoutes', roles, { root: true })
    // dynamically add accessible routes
    router.addRoutes(accessRoutes)

    // reset visited views and cached views
    dispatch('tagsView/delAllViews', null, { root: true })
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
