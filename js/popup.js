const defaultConfig = `/**
 * @description <summary>
 * @param {Object} data 请求参数
 * @returns {Promise} ajax
 */
export const <method><apiName> = data => {
  return axios({
    url: '<path>',
    method: '<method>',
    data
  })
}`
let url = ''

// 保存
$('.j-config-save').click(function () {
  chrome.storage.local.get('configMap', res => {
    const configMap = res.configMap || {}
    configMap[url] = $('.j-config').val()
    chrome.storage.local.set({ configMap: configMap })
    $(this).text('ok')
    setTimeout(() => {
      $(this).text('保存')
    }, 600)
  })
})

// 重置
$('.j-reset').click(function () {
  $('.j-config').val(defaultConfig)
  $(this).text('ok')
  setTimeout(() => {
    $(this).text('重置')
  }, 600)
})

window.onload = () => {
  init()
}

// 初始化
const init = () => {
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const _url = new URL(tabs[0].url)
      const domain = _url.hostname
      const port = _url.port

      url = domain + ':' + port

      $('.j-name').text(url)
      try {
        chrome.storage.local.get('configMap', res => {
          const config = (res.configMap || {})[url] || defaultConfig
          $('.j-config').val(config)
        })
      } catch (err) {
        $('.j-config').val(defaultConfig)
      }
    })
  } catch (err) {
    console.log('err', err)
  }
}