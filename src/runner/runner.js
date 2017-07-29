const _ = require('lodash')
const env = require('./env')
const modules = require('./modules')
const components = require('./components')
const { deepClone, microsecond } = require('../utils')

class WeexNodeRunner {
  constructor (frameworks, runtime, services) {
    this._history = []
    this._logs = []
    this.mockGlobalAPI()

    const { init, config } = runtime
    config.frameworks = frameworks

    for (const serviceName in services) {
      runtime.service.register(serviceName, services[serviceName])
    }

    // runtime.freezePrototype()
    // runtime.setNativeConsole()

    // init frameworks
    this._context = init(config)

    this._context.registerModules(modules)
    this._context.registerComponents(components)
  }

  mockGlobalAPI () {
    global.callNative = env.mockCallNative(_task => {
      const task = deepClone(_task)
      task.time = microsecond()
      this._history.push(task)
    })
    global.WXEnvironment = env.mockWXEnvironment()
    // Object.assign(console, env.mockConsole((type, ...args) => {
    //   this._logs.push({
    //     type,
    //     time: microsecond(),
    //     text: args.join(' ')
    //   })
    // }))
  }

  execute (code) {
    const createInstance = this._context.createInstance
    const destroyInstance = this._context.destroyInstance
    return new Promise((resolve, reject) => {
      let instance = null
      const instanceId = _.uniqueId()
      try {
        instance = createInstance.call(null, instanceId, code)
      } catch (e) {
        this.reset()
        // console.log(` => catch in execute`)
        const result = this.standardizeResult(instance)
        result.exception = e
        reject(result)
      }
      if (instance) {
        setTimeout(() => {
          const result = this.standardizeResult(instance)
          destroyInstance(instanceId)
          this.reset()
          resolve(result)
        }, 100)
      }
    })
  }

  reset () {
    env.resetConsole()
    this._history = []
    this._logs = []
  }

  standardizeResult (instance) {
    // console.log(` => standardize result`)
    const result = {
      logs: deepClone(this._logs),
      history: deepClone(this._history)
    }
    if (instance && instance.document) {
      result.vdom = deepClone(instance.document.body || instance.document.documentElement)
    }
    return result
  }
}

module.exports = WeexNodeRunner
