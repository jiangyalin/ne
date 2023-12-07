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
const defaultHeadConfig = `import { axios } from '@/utils/request'`
const defaultFooterConfig = ``
const defaultCheckboxConfig = false

let url = ''
document.querySelector('#checkboxTs').addEventListener('change',()=>{
  chrome.storage.local.get('checkConfigMap', res => {
    const checkConfigMap = res.checkConfigMap || {}
    checkConfigMap[url] = $('#checkboxTs').prop('checked')
    console.log(checkConfigMap)
    chrome.storage.local.set({ checkConfigMap: checkConfigMap })
  })
  
})

// 保存
$('.j-config-save').click(function () {
  chrome.storage.local.get('configMap', res => {
    const configMap = res.configMap || {}
    configMap[url] = $('.j-config').val()
    chrome.storage.local.set({ configMap: configMap })
  })
  chrome.storage.local.get('headConfigMap', res => {
    const headConfigMap = res.headConfigMap || {}
    headConfigMap[url] = $('.j-head-config').val()
    chrome.storage.local.set({ headConfigMap: headConfigMap })
  })

  chrome.storage.local.get('checkConfigMap', res => {
    const checkConfigMap = res.checkConfigMap || {}
    checkConfigMap[url] = $('#checkboxTs').prop('checked')
    console.log(checkConfigMap)
    chrome.storage.local.set({ checkConfigMap: checkConfigMap })
  })

  chrome.storage.local.get('footerConfigMap', res => {
    const footerConfigMap = res.footerConfigMap || {}
    footerConfigMap[url] = $('.j-footer-config').val()
    chrome.storage.local.set({ footerConfigMap: footerConfigMap })
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
        chrome.storage.local.get('checkConfigMap', res => {
          const config = (res.checkConfigMap || {})[url] || defaultCheckboxConfig
          console.log(config);
          $('#checkboxTs').prop('checked', config);
        })
        chrome.storage.local.get('headConfigMap', res => {
          const config = (res.headConfigMap || {})[url] || defaultHeadConfig
          $('.j-head-config').val(config)
        })
        chrome.storage.local.get('footerConfigMap', res => {
          const config = (res.footerConfigMap || {})[url] || defaultFooterConfig
          $('.j-footer-config').val(config)
        })
      } catch (err) {
        $('.j-config').val(defaultConfig)
        $('.j-head-config').val(defaultHeadConfig)
        $('#checkboxTs').val(defaultCheckboxConfig)
        $('.j-footer-config').val(defaultFooterConfig)
      }
    })
  } catch (err) {
    console.log('err', err)
  }
}