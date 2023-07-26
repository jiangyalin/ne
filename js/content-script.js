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

const apiList = []

const start = () => {
  const interval = setInterval(() => {
    if (!document.querySelector('#select')) return false
    clearInterval(interval)
    const url = document.querySelector('#select').value
    $.get('http://192.168.3.104:9001' + url, res => {
      for (const key in res.paths) {
        for (const method in res.paths[key]) {
          const item = res.paths[key][method]
          const id = 'operations-' + item.tags[0] + '-' + item.operationId

          const apiName = key.split('/').filter(item => item).map(item => capitalizeFirstLetter(item)).join('')
          const code =
            `
// ${item.summary}
export const ${method}${apiName} = data => {
  return axios({
    url: '${key}',
    method: ${method},
    data
  })
}
`

          apiList.push({
            id,
            tag: item.tags[0],
            method,
            code,
            path: key
          })
        }
      }

      res.tags.forEach(item => {
        const id = 'operations-tag-' + item.name

        $('#' + id).prepend('<button style="width: 100px;" class="j-btn-down" type="button" data-tag="' + item.name +'">下载</button>')
      })
    })

  }, 1000)
}

const init = () => {
  start()

  $('body').on('click', '.opblock-tag', function () {
    const isOpen = $(this).attr('data-is-open') === 'true'
    if (!isOpen) return false
    setTimeout(() => {
      const tag = $(this).attr('data-tag')
      apiList.filter(item => item.tag === tag).forEach(item => {
        const dom = $('#' + item.id + ' .opblock-summary')
        if (dom) dom.append('<button class="j-btn-copy" type="button" data-id="' + item.id +'">复制</button>')
      })
    }, 300)
  })

  $('body').on('click', '.j-btn-copy', function () {
    const api = apiList.find(item => item.id === $(this).attr('data-id'))
    copyToClipboard(api.code)
    $(this).text('ok')
    setTimeout(() => {
      $(this).text('复制')
    }, 600)
  })

  $('body').on('click', '.j-btn-down', function () {
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
