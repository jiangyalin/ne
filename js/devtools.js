// let filter = '@'
//
// const analyzePaneFilter = () => {
//   setInterval(() => {
//     try {
//       chrome.storage.local.get('filterUrl', res => {
//         filter = res.filterUrl
//       })
//     } catch (err) {
//       filter = 'http://192.168.3.104:9001'
//     }
//   }, 3000)
// }
//
// analyzePaneFilter()
//
// chrome.devtools.network.onRequestFinished.addListener(function (request) {
//   request.getContent(function (content) {
//     if (request.request.url.indexOf(filter) === -1 && filter !== '@') return false
//     if (request.request.method === 'OPTIONS') return false
//     chrome.runtime.sendMessage({
//       name: 'panel-list',
//       tabId: chrome.devtools.inspectedWindow.tabId,
//       content: {
//         url: request.request.url,
//         content: content,
//         request
//       }
//     })
//   })
// })
