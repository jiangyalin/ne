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
    data.parameters.filter(item => item.in !== 'header').forEach(item => {
      // console.log('item', item)
      requestBodyArr.push(`  ${item.name}: ${typeToDefaults[item.schema.type]}, // ${item.description}`)
    })
  }
  return requestBodyArr
}

const getParameterV2 = (data, schemas) => {
  let query = []
  let body = []
  let header = []

  for (const key in data.parameters) {
    const item = data.parameters[key]
    if (item.in === 'query') {
      const ref = item.schema?.$ref || ''
      if (ref) query.push(...refToObj(ref, schemas))
      if (!ref) query.push(`  ${item.name}: ${typeToDefaults[item.type]}, // ${item.description}`)
    }
    if (item.in === 'body') {
      const ref = item.schema?.$ref || ''
      if (ref) body.push(...refToObj(ref, schemas))
      if (!ref) body.push(`  ${item.name}: ${typeToDefaults[item.type]}, // ${item.description}`)
    }
  }

  return {
    query,
    body,
    header
  }
}

let apiList = []

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

let configMap = {}
let headConfigMap = {}
let footerConfigMap = {}

const getAnchors = (path = '') => path.substring(path.lastIndexOf('/') + 1)

// 根据后端类型树生产ts类型接口
const findTs = (tree, anchors, data = []) => {
  const _anchors = getAnchors(anchors)
  for (const key in tree) {
    const item = tree[key]
    if (key === _anchors) {
      if (item.type === 'object') {
        for (const _key in item.properties) {
          const node = item.properties[_key]
          const type = node.type || ''
          const description = node.description || ''
          const enumList = node.enum || []

          if (type === 'boolean') {
            data.push({ key: _key, type: 'boolean', description, enumList })
          }
          if (type === 'integer') {
            data.push({ key: _key, type: 'number', description, enumList })
          }
          if (type === 'string') {
            data.push({ key: _key, type: 'string', description, enumList })
          }
          if (!type && !node.$ref) {
            data.push({ key: _key, type: 'any', description, enumList })
          }
          if (node.$ref) {
            const children = findTs(tree, node.$ref)
            if (children.length === 1) {
              data.push({ ...children[0], key: _key })
            } else {
              data.push({ key: _key, type: 'any', description, children, enumList })
            }
          }

          if (type === 'array') {
            const children = findTs(tree, node.items.$ref)
            data.push({ key: _key, type: 'any[]', description, children, enumList })
          }
        }
      }

      if (item.type === 'boolean') {
        data.push({ key, type: 'boolean', description: item.description, enumList: item.enum || [] })
      }
      if (item.type === 'integer') {
        data.push({ key, type: 'number', description: item.description, enumList: item.enum || [] })
      }
      if (item.type === 'string') {
        data.push({ key, type: 'string', description: item.description, enumList: item.enum || [] })
      }
      if (!item.type && !item.$ref) {
        data.push({ key, type: 'any', description: item.description, enumList: item.enum || [] })
      }
      if (item.$ref) {
        const children = findTs(tree, item.$ref)
        if (children.length === 1) {
          data.push({ ...children[0], key })
        } else {
          data.push({ key, type: 'any', description: item.description, children, enumList: item.enum || [] })
        }
      }

      if (item.type === 'array') {
        const children = findTs(tree, item.items.$ref)
        data.push({ key, type: 'any[]', description: item.description, children, enumList: item.enum || [] })
      }
    }
  }

  return data
}

const swaggerToTS = (tree = [], data = '') => {
  tree.forEach(item => {
    if (!item.children) {
      if (item.description) data += `/** ${item.description} */\n`
      if (item.enumList.length) {
        data += `${item.key}: ${item.enumList.join(' | ')},\n`
      } else {
        data += `${item.key}: ${item.type},\n`
      }
    }
    if (item.children) {
      if (item.description) data += `/** ${item.description} */\n`
      if (item.type === 'any[]') {
        data += `${item.key}: Array<{\n`
        data += `${swaggerToTS(item.children)}`
        data += `}>\n`
      } else {
        data += `${item.key}: {\n`
        data += `${swaggerToTS(item.children)}`
        data += `}\n`
      }
    }
  })
  return data
}

const start = () => {
  const isSwaggerV1_0_0 = Boolean(document.querySelector('#swagger-ui'))
  const isSwaggerV2_0 = Boolean(document.querySelector('.swagger-section'))
  const isSwagger = isSwaggerV1_0_0 || isSwaggerV2_0
  if (!isSwagger) return false

  const interval = setInterval(() => {
    if (isSwaggerV1_0_0 && !document.querySelector('#select')) return false
    clearInterval(interval)
    let url = ''
    if (isSwaggerV1_0_0) url = window.location.origin + document.querySelector('#select').value
    if (isSwaggerV2_0) url = document.querySelector('#input_baseUrl').value
    $.get(url, res => {
      apiList = []
      for (const key in res.paths) {
        for (const method in res.paths[key]) {
          const item = res.paths[key][method]
          const id = 'operations-' + item.tags[0] + '-' + item.operationId

          const apiName = key.split('/').filter(item => item).map(item => capitalizeFirstLetter(item)).join('')

          let requestBodyArr = []
          if (isSwaggerV1_0_0) requestBodyArr = getParameter(item, res.components.schemas)
          if (isSwaggerV2_0) {
            const parameter = getParameterV2(item, res.definitions)
            requestBodyArr = method === 'post' ? parameter.body : parameter.query
          }

          const requestBody = '{\n' + requestBodyArr.join('\n') + '\n}'

          // 接口返回参数的ts类型
          let returnTs = ''
          if (item.responses['200']) {
            if (item.responses['200']?.content) {
              if (item.responses['200'].content['application/json']) {
                if (item.responses['200'].content['application/json'].schema) {
                  if (item.responses['200'].content['application/json'].schema.$ref) {
                    const content = swaggerToTS(findTs(res.components.schemas, item.responses['200'].content['application/json'].schema.$ref))
                    returnTs = `${content}`
                  }
                }
              }
            }
          }

          const path = key

          const summary = item.summary

          const request = requestBody

          const code = (configMap[window.location.host] || defaultConfig).replace(/<summary>/g, summary)
            .replace(/<method>/g, method)
            .replace(/<METHOD>/g, method.toUpperCase())
            .replace(/<apiName>/g, apiName)
            .replace(/<path>/g, path)
            .replace(/<request>/g, request)

          apiList.push({
            id,
            apiName,
            tag: item.tags[0],
            method,
            code,
            path,
            requestBody,
            request,
            summary,
            returnTs
          })
        }
      }

      let tags = []

      if (isSwaggerV1_0_0) tags = res.tags.map(item => ({ id: 'operations-tag-' + item.name, tag: item.name }))
      if (isSwaggerV2_0) {
        for (const nemeKey in res.ControllerDesc) {
          tags.push({
            id: 'resource_' + nemeKey,
            tag: nemeKey
          })
        }
      }

      if (isSwaggerV1_0_0) {
        // 生成下载按钮
        tags.forEach(item => {
          $('#' + item.id)
            .parents('.opblock-tag-section').attr('style', 'position: relative')
            .prepend('<button style="width: 60px;position: absolute;top: 24px;left: -60px;" class="j-btn-down" type="button" data-tag="' + item.tag +'">下载</button>')
        })
      }
      if (isSwaggerV2_0) {
        // 生成下载按钮
        tags.forEach(item => {
          $('#' + item.id + '>.heading .options')
            .prepend('<li class="controller-summary j-btn-down" style="cursor: pointer" data-tag="' + item.tag +'">下载</li>')
        })

        // 生成复制与参数按钮
        // apiList.forEach(item => {
        //   $('#' + item.tag + '—')
        //   console.log('item', item.tag)
        // })
      }
    })

  }, 1000)
}


const init = () => {
  chrome.storage.local.get('configMap', res => {
    configMap = res.configMap || {}
  })
  chrome.storage.local.get('headConfigMap', res => {
    headConfigMap = res.headConfigMap || {}
  })
  chrome.storage.local.get('footerConfigMap', res => {
    footerConfigMap = res.footerConfigMap || {}
  })
  start()

  // 只在isSwaggerV1_0_0生效
  $('body').on('click', '.opblock-tag', function () {
    const isOpen = $(this).attr('data-is-open') === 'true'
    if (!isOpen) return false
    setTimeout(() => {
      const tag = $(this).attr('data-tag')
      apiList.filter(item => item.tag === tag).forEach(item => {
        const dom = $('#' + item.id + ' .opblock-summary')
        if (dom) dom.append('<button class="j-btn-copy" type="button" data-id="' + item.id +'">复制</button>')
        if (dom) dom.append('<button class="j-btn-pass-parameters" type="button" data-id="' + item.id +'">传参</button>')
        if (dom) dom.append('<button class="j-btn-pass-parameters-type" type="button" data-id="' + item.id +'">传参TS</button>')
        if (dom) dom.append('<button class="j-btn-return-parameters-type" type="button" data-id="' + item.id +'">返参TS</button>')
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

  // 返回参数类型(返参TS)
  $('body').on('click', '.j-btn-return-parameters-type', function () {
    const api = apiList.find(item => item.id === $(this).attr('data-id'))
    copyToClipboard(api.returnTs)
    $(this).text('ok')
    setTimeout(() => {
      $(this).text('返参TS')
    }, 600)
  })

  // 下载
  $('body').on('click', '.j-btn-down', function (event) {
    event.preventDefault()
    const tag = $(this).attr('data-tag')
    const code = (headConfigMap[window.location.host] || defaultHeadConfig) + '\n' + apiList.filter(item => item.tag === tag).map(item => item.code).join('\n\n') + '\n\n' + (footerConfigMap[window.location.host] || defaultFooterConfig)
    funDownload(code, tag + '.js')
  })
  
  $('body').on('change', '#select', function () {
    start()
  })
}

window.onload = function () {
  init()
}
