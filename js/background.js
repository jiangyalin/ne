//-------------------- 右键菜单演示 ------------------------//
// chrome.contextMenus.create({
//   title: '测试右键菜单',
//   onclick: (e, a, b) => {
//     chrome.notifications.create(null, {
//       type: 'basic',
//       iconUrl: 'icon.png',
//       title: '这是标题',
//       message: '您刚才点击了自定义右键菜单！'
//     })
//   }
// })

// const urlToObj = url => {
//   const obj = {}
//   const arr = url.split('?')
//   obj.url = arr[0]
//   obj.api = arr[0].split('/').filter((item, index) => index > 2).join('/')
//   obj.params = arr[1] ? arr[1].split('&').map(item => {
//     const _arr = item.split('=')
//     return {
//       key: _arr[0],
//       value: _arr[1]
//     }
//   }) : []
//   return obj
// }
//
// const analyzePanelList = request => {
//   const api = urlToObj(request.content.url).api
//   const content = JSON.parse(request.content?.content || '{}')
//   const query = {}
//   request.content.request.request.queryString.forEach(item => {
//     query[item.name] = item.value
//   })
//   const headers = {}
//   headers.Authorization = request.content.request.request.headers.find(item => item.name === 'Authorization')?.value || ''
//   const _request = {
//     query: query,
//     headers: headers,
//     method: request.content.request.request.method,
//     body: JSON.parse(request.content?.request?.request?.postData?.text || '{}')
//   }
//   if (!list.find(item => item.url === api)) {
//     list.push({
//       url: api,
//       content: content,
//       request: _request,
//       returnTime: new Date().getTime()
//     })
//   } else {
//     list.find(item => item.url === api).content = content
//     list.find(item => item.url === api).request = _request
//     list.find(item => item.url === api).returnTime = new Date().getTime()
//   }
//   chrome.storage.local.set({ list })
// }
//
// const list = []
//
// chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
//   if (request.name === 'panel-list') analyzePanelList(request)
// })