import colors from 'picocolors'
import type { Logger } from './logger'
import type { ResolvedConfig, ResolvedEnvironmentOptions } from './config'
import type { Plugin } from './plugin'

export class PartialEnvironment {
  name: string
  getTopLevelConfig(): ResolvedConfig {
    return this._topLevelConfig
  }

  config: ResolvedConfig & ResolvedEnvironmentOptions

  /**
   * @deprecated use environment.config instead
   **/
  get options(): ResolvedEnvironmentOptions {
    return this._options
  }

  logger: Logger

  /**
   * @internal
   */
  _options: ResolvedEnvironmentOptions
  /**
   * @internal
   */
  _topLevelConfig: ResolvedConfig

  constructor(
    name: string,
    topLevelConfig: ResolvedConfig,
    options: ResolvedEnvironmentOptions = topLevelConfig.environments[name],
  ) {
    this.name = name
    this._topLevelConfig = topLevelConfig
    this._options = options
    this.config = new Proxy(
      options as ResolvedConfig & ResolvedEnvironmentOptions,
      {
        get: (target, prop: keyof ResolvedConfig) => {
          if (prop === 'logger') {
            return this.logger
          }
          if (prop in target) {
            return this._options[prop as keyof ResolvedEnvironmentOptions]
          }
          return this._topLevelConfig[prop]
        },
      },
    )
    const environment = colors.dim(`(${this.name})`)
    const colorIndex =
      [...this.name].reduce((acc, c) => acc + c.charCodeAt(0), 0) %
      environmentColors.length
    const infoColor = environmentColors[colorIndex || 0]
    this.logger = {
      get hasWarned() {
        return topLevelConfig.logger.hasWarned
      },
      info(msg, opts) {
        return topLevelConfig.logger.info(msg, {
          ...opts,
          environment: infoColor(environment),
        })
      },
      warn(msg, opts) {
        return topLevelConfig.logger.warn(msg, {
          ...opts,
          environment: colors.yellow(environment),
        })
      },
      warnOnce(msg, opts) {
        return topLevelConfig.logger.warnOnce(msg, {
          ...opts,
          environment: colors.yellow(environment),
        })
      },
      error(msg, opts) {
        return topLevelConfig.logger.error(msg, {
          ...opts,
          environment: colors.red(environment),
        })
      },
      clearScreen(type) {
        return topLevelConfig.logger.clearScreen(type)
      },
      hasErrorLogged(error) {
        return topLevelConfig.logger.hasErrorLogged(error)
      },
    }
  }
}

export class BaseEnvironment extends PartialEnvironment {
  get plugins(): Plugin[] {
    if (!this._plugins)
      throw new Error(
        `${this.name} environment.plugins called before initialized`,
      )
    return this._plugins
  }

  /**
   * @internal
   */
  _plugins: Plugin[] | undefined
  /**
   * @internal
   */
  _initiated: boolean = false

  constructor(
    name: string,
    config: ResolvedConfig,
    options: ResolvedEnvironmentOptions = config.environments[name],
  ) {
    super(name, config, options)
  }
}

/**
 * This is used both to avoid users to hardcode conditions like
 * !scan && !build => dev
 */
export class FutureCompatEnvironment extends BaseEnvironment {
  mode = 'futureCompat' as const
}

const environmentColors = [
  colors.blue,
  colors.magenta,
  colors.green,
  colors.gray,
]
