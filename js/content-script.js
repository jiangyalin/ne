const copyToClipboard = (text = '') => {
  const textarea = document.createElement('textarea')
  textarea.value = text
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

// 生成下载文件并下载
const funDownload = (content, filename) => {
  // 创建隐藏的可下载链接
  const eleLink = document.createElement('a')
  eleLink.download = filename
  eleLink.style.display = 'none'
  // 字符内容转变成blob地址
  const blob = new Blob([content])
  eleLink.href = URL.createObjectURL(blob)
  // 触发点击
  document.body.appendChild(eleLink)
  eleLink.click()
  // 然后移除
  document.body.removeChild(eleLink)
}

const capitalizeFirstLetter = (str = '') => str.charAt(0).toUpperCase() + str.slice(1)

const typeToDefaults = {
  string: '\'\'',
  integer: 0,
  array: '[]',
  number: 0,
  boolean: false
}

const refToObj = (ref, schemas) => {
  const data = []
  const key = ref.substring(ref.lastIndexOf('/') + 1)
  const properties = schemas[key].properties
  for (const parameterKey in properties) {
    const _ref = properties[parameterKey].$ref
    if (_ref) {
      const _key = _ref.substring(_ref.lastIndexOf('/') + 1)
      const _description = (schemas[_key].description || '').replace(/&nbsp/g, '').replace(/<br \/>/g, '')

      const isEnum = Boolean(schemas[_key].enum)
      if (isEnum) {
        data.push(`  ${parameterKey}: ${schemas[_key].enum[0]}, // ${_description}`)
      }

      const isObject = schemas[_key].type === 'object'
      if (isObject) {
        data.push(`  ${parameterKey}: { // ${_description}`)
        data.push(...refToObj(_ref, schemas).map(item => '  ' + item))
        data.push(`  },`)
      }
    } else {
      data.push(`  ${parameterKey}: ${typeToDefaults[properties[parameterKey].type]}, // ${properties[parameterKey].description}`)
    }
  }
  return data
}

const getParameter = (data, schemas) => {
  const requestBodyArr = []
  if (data.requestBody) {
    const ref = data.requestBody.content['text/json']?.schema?.$ref || ''
    if (ref) requestBodyArr.push(...refToObj(ref, schemas))
  }

  if (data.parameters) {
    data.parameters.forEach(item => {
      requestBodyArr.push(`  ${item.name}: ${typeToDefaults[item.schema.type]}, // ${item.description}`)
    })
  }
  return requestBodyArr
}

let apiList = []

let stencil = `/**
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

let configMap = {}

const start = () => {
  const interval = setInterval(() => {
    if (!document.querySelector('#select')) return false
    clearInterval(interval)
    const url = document.querySelector('#select').value
    $.get(window.location.origin + url, res => {
      apiList = []
      for (const key in res.paths) {
        for (const method in res.paths[key]) {
          const item = res.paths[key][method]
          const id = 'operations-' + item.tags[0] + '-' + item.operationId

          const apiName = key.split('/').filter(item => item).map(item => capitalizeFirstLetter(item)).join('')
          const requestBodyArr = getParameter(item, res.components.schemas)
          const requestBody = '{\n' + requestBodyArr.join('\n') + '\n}'
          const path = key
          const summary = item.summary
          const request = requestBody

          const code = (configMap[window.location.host] || stencil).replace(/<summary>/g, summary)
            .replace(/<method>/g, method)
            .replace(/<apiName>/g, apiName)
            .replace(/<path>/g, path)
            .replace(/<request>/g, request)

//           const code =
//             `
// /**
//  * @description${summary}
//  * @param {Object} data 请求参数
//  * @returns {Promise} ajax
//  */
// export const ${method}${apiName} = data => {
//   return axios({
//     url: '${path}',
//     method: '${method}',
//     data
//   })
// }
// `

          apiList.push({
            id,
            apiName,
            tag: item.tags[0],
            method,
            code,
            path,
            requestBody,
            request,
            summary
          })
        }
      }

      res.tags.forEach(item => {
        const id = 'operations-tag-' + item.name

        $('#' + id)
          .parents('.opblock-tag-section').attr('style', 'position: relative')
          .prepend('<button style="width: 60px;position: absolute;top: 24px;left: -60px;" class="j-btn-down" type="button" data-tag="' + item.name +'">下载</button>')
      })
    })

  }, 1000)
}


const init = () => {
  chrome.storage.local.get('configMap', res => {
    configMap = res.configMap || {}
  })
  start()

  $('body').on('click', '.opblock-tag', function () {
    const isOpen = $(this).attr('data-is-open') === 'true'
    if (!isOpen) return false
    setTimeout(() => {
      const tag = $(this).attr('data-tag')
      apiList.filter(item => item.tag === tag).forEach(item => {
        const dom = $('#' + item.id + ' .opblock-summary')
        if (dom) dom.append('<button class="j-btn-copy" type="button" data-id="' + item.id +'">复制</button>')
        if (dom) dom.append('<button class="j-btn-pass-parameters" type="button" data-id="' + item.id +'">传参</button>')
      })
    }, 300)
  })

  // 复制
  $('body').on('click', '.j-btn-copy', function () {
    const api = apiList.find(item => item.id === $(this).attr('data-id'))
    copyToClipboard(api.code)
    $(this).text('ok')
    setTimeout(() => {
      $(this).text('复制')
    }, 600)
  })

  // 传参
  $('body').on('click', '.j-btn-pass-parameters', function () {
    const api = apiList.find(item => item.id === $(this).attr('data-id'))
    copyToClipboard(api.requestBody)
    $(this).text('ok')
    setTimeout(() => {
      $(this).text('传参')
    }, 600)
  })

  // 下载
  $('body').on('click', '.j-btn-down', function (event) {
    event.preventDefault()
    const tag = $(this).attr('data-tag')
    const code = `import { axios } from '@/utils/request'\n` + apiList.filter(item => item.tag === tag).map(item => item.code).join('')
    funDownload(code, tag + '.js')
  })
  
  $('body').on('change', '#select', function () {
    start()
  })
}

window.onload = function () {
  init()
}
