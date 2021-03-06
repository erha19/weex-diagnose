const _ = require('lodash')
const analyseVdom = require('./vdom')
const analyseLogs = require('./logs')
const analyseHistory = require('./history')
const analyseSyntax = require('./syntax')
const analyseException = require('./exception')
const { mergeResult } = require('../utils')


class Analyser {
  constructor (options = {}) {
    this._raw = {
      info: filterOptions(options),
      lifecycle: [],
      eslint: [],
      syntax: {},
      history: {},
      summary: {},
      logs: {},
      vdom: {}
    }
    this.tips = []
    this.warnings = []
    this.errors = []
  }

  takeRecord (type, record) {
    // console.log(` => take record form ${type}`)

    switch (type) {
      case 'info': {
        Object.assign(this._raw.info, record)
      } break

      case 'runner': {
        Object.assign(this._raw, record)
      } break

      case 'lifecycle': {
        record.type = 'lifecycle'
        this._raw.lifecycle.push(record)
      } break

      case 'eslint': {
        record.type = 'eslint'
        if (this.shouldTakeEslintRecord(record)) {
          this._raw.eslint.push(record)
          // console.log(this._raw.eslint)
        }
      } break

      default: {
        if (_.isPlainObject(record)) {
          this._raw[type] = this._raw[type] || {}
          Object.assign(this._raw[type], record)
        } else {
          this._raw[type] = record
        }
      }
    }
  }

  shouldTakeEslintRecord (record) {
    const { ruleId, source } = record
    if (ruleId === 'no-unused-vars') {
      return !/_vm\._self\._c/.test(source)
    }
    return true
  }

  analyse () {
    // console.log(' => start analyse')
    this.info = this._raw.info
    this.vdom = analyseVdom(this._raw.vdom)
    this.history = analyseHistory(this._raw.history)
    this.exception = analyseException(this._raw.exception)
    const res = analyseSyntax(this._raw.syntax)
    if (res) {
      this.tips.push(...res.tips)
      this.warnings.push(...res.warnings)
      this.errors.push(...res.errors)
    }
    const eslint = _.partition(this._raw.eslint, { severity: 1 })
    if (eslint) {
      this.warnings.push(...eslint[0])
      this.errors.push(...eslint[1])
    }

    const logs = analyseLogs(this._raw.logs)
    // this.tips.push(...logs.tips)
    this.warnings.push(...logs.warnings)
    this.errors.push(...logs.errors)
    this.messages = logs.messages

    // console.log(this.tips)
    // console.log(this.warnings)
    // console.log(this.errors)
  }

  getResult () {
    this.analyse()
    const { logs, vdom, history, exception, _raw } = this
    return {
      info: this.info,
      tips: this.tips,
      warnings: this.warnings,
      errors: this.errors,
      history: history.records,
      messages: this.messages,
      syntax: _.cloneDeep(_raw.syntax),
      summary: Object.assign({
        bundleSize: _raw.bundleSize
      }, vdom.summary, history.summary),
      vdom: vdom
    }
  }
}

function filterOptions (options) {
  const info = {}
  for (const key in options) {
    if (key !== 'code') {
      info[key] = options[key]
    }
  }
  return info
}

module.exports = Analyser
