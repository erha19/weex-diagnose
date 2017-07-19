/**
 * 分析 callNative 历史记录，生成报告
 *  > callNative 的调用次数
 *  > 各种模块的调用次数
 *  > 各模块中各种方法的调用次数
 */

function forEachNode ($root, fn, options = { depth: 1 }) {
  fn.apply(null, [$root, options])
  if ($root.children && $root.children.length) {
    $root.children.forEach(node => {
      forEachNode(node, fn, {
        depth: options.depth + 1
      })
    })
  }
}

function accumulate (object, key, step = 1) {
  object[key] = object[key] || 0
  object[key] += step
}

function getSummary (history) {
  const summary = {}
  if (Array.isArray(history)) {
    history.forEach(({ module, method, args }) => {
      accumulate(summary, module)
      accumulate(summary, `${module}.${method}`)
    })
  }
  return summary
}

module.exports = class Analyser {
  constructor (options) {
    this._report = {
      summary: {}
    }
  }

  analyseCode (code) {}

  analyseHistory (history) {
    const { callNative, callJS, refresh } = history
    const callCount = {}
    if (Array.isArray(callNative)) {
      callNative.forEach(({ module, method, args }) => {
        accumulate(callCount, module)
        accumulate(callCount, `${module}.${method}`)
      })
    }
    this._report.history = callNative
    this._report.summary.callCount = callCount
  }

  analyseDOMTree ($root) {
    // console.log($root)
    let totalCount = 0
    let totalDepth = 0
    const layers = {}
    const nodeMap = {}
    const cssProps = {}

    forEachNode($root, (node, { depth }) => {
      totalCount++
      totalDepth = Math.max(depth, totalDepth)
      nodeMap[node.ref] = node

      if (layers[depth]) {
        layers[depth].push(node.ref)
      } else {
        layers[depth] = [node.ref]
      }

      for (const prop in node.style) {
        accumulate(cssProps, prop)
      }
    })

    Object.assign(this._report.summary, { totalCount, totalDepth, layers, cssProps })
  }

  getReport () {
    return this._report
  }
}
