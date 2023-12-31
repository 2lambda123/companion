import { EmberServer, Model as EmberModel } from 'emberplus-connection'
import { getPath } from 'emberplus-connection/dist/Ember/Lib/util.js'
import { CreateBankControlId } from '../Shared/ControlId.js'
import ServiceBase from './Base.js'
import { pad } from '../Resources/Util.js'

const NODE_STATE = 0
const NODE_TEXT = 1
const NODE_TEXT_COLOR = 2
const NODE_BG_COLOR = 3

function buildPathForButton(page, bank, node) {
	return `0.1.${page}.${bank}.${node}`
}
function formatColorAsHex(color) {
	return `#${pad(Number(color).toString(16).slice(-6), '0', 6)}`
}
function parseHexColor(hex) {
	return parseInt((hex + '').slice(1, 7), 16)
}

/**
 * Class providing the Ember+ api.
 *
 * @extends ServiceBase
 * @author Balte de Wit <contact@balte.nl>
 * @author Håkon Nessjøen <haakon@bitfocus.io>
 * @author Keith Rocheck <keith.rocheck@gmail.com>
 * @author William Viker <william@bitfocus.io>
 * @author Julian Waller <me@julusian.co.uk>
 * @since 2.1.1
 * @copyright 2022 Bitfocus AS
 * @license
 * This program is free software.
 * You should have received a copy of the MIT licence as well as the Bitfocus
 * Individual Contributor License Agreement for Companion along with
 * this program.
 *
 * You can be released from the requirements of the license by purchasing
 * a commercial license. Buying such a license is mandatory as soon as you
 * develop commercial activities involving the Companion software without
 * disclosing the source code of your own applications.
 */
class ServiceEmberPlus extends ServiceBase {
	/**
	 * The port to open the socket with.  Default: <code>9092</code>
	 * @type {number}
	 * @access protected
	 */
	port = 9092

	/**
	 * Bank state array
	 * @type {Object}
	 * @access protected
	 */
	pushedButtons = {}

	/**
	 * @param {Registry} registry - the application's core
	 */
	constructor(registry) {
		super(registry, 'ember+', 'Service/EmberPlus', 'emberplus_enabled')

		this.graphics.on('bank_invalidated', this.#updateBankFromRender.bind(this))

		this.init()
	}

	/**
	 * Close the socket before deleting it
	 * @access protected
	 */
	close() {
		this.server.discard()
	}

	/**
	 * Get the page/bank structure in EmberModel form
	 * @returns {EmberModel.NumberedTreeNodeImpl[]}
	 * @access private
	 */
	#getPagesTree() {
		this.pushedButtons = {}

		let pages = this.page.getAll(true)

		for (let page = 1; page <= 99; page++) {
			for (let bank = 1; bank <= 32; bank++) {
				this.pushedButtons[page + '_' + bank] = 0
			}
		}

		let output = {}

		for (let page = 1; page <= 99; page++) {
			const children = {}
			for (let bank = 1; bank <= 32; bank++) {
				const control = this.controls.getControl(CreateBankControlId(page, bank))

				let drawStyle = {}
				if (control && typeof control.getDrawStyle === 'function') {
					drawStyle = control.getDrawStyle() || {}
				}

				children[bank] = new EmberModel.NumberedTreeNodeImpl(
					bank,
					new EmberModel.EmberNodeImpl(`Button ${page}.${bank}`),
					{
						[NODE_STATE]: new EmberModel.NumberedTreeNodeImpl(
							NODE_STATE,
							new EmberModel.ParameterImpl(
								EmberModel.ParameterType.Boolean,
								'State',
								undefined,
								this.pushedButtons[page + '_' + bank] ? true : false,
								undefined,
								undefined,
								EmberModel.ParameterAccess.ReadWrite
							)
						),
						[NODE_TEXT]: new EmberModel.NumberedTreeNodeImpl(
							NODE_TEXT,
							new EmberModel.ParameterImpl(
								EmberModel.ParameterType.String,
								'Label',
								undefined,
								drawStyle.text || '',
								undefined,
								undefined,
								EmberModel.ParameterAccess.ReadWrite
							)
						),
						[NODE_TEXT_COLOR]: new EmberModel.NumberedTreeNodeImpl(
							NODE_TEXT_COLOR,
							new EmberModel.ParameterImpl(
								EmberModel.ParameterType.String,
								'Text_Color',
								undefined,
								formatColorAsHex(drawStyle.color || 0),
								undefined,
								undefined,
								EmberModel.ParameterAccess.ReadWrite
							)
						),
						[NODE_BG_COLOR]: new EmberModel.NumberedTreeNodeImpl(
							NODE_BG_COLOR,
							new EmberModel.ParameterImpl(
								EmberModel.ParameterType.String,
								'Background_Color',
								undefined,
								formatColorAsHex(drawStyle.bgcolor || 0),
								undefined,
								undefined,
								EmberModel.ParameterAccess.ReadWrite
							)
						),
					}
				)
			}

			output[page] = new EmberModel.NumberedTreeNodeImpl(
				page,
				new EmberModel.EmberNodeImpl(pages[page].name === 'PAGE' ? 'Page ' + page : pages[page].name),
				children
			)
		}

		return output
	}

	/**
	 * Start the service if it is not already running
	 * @access protected
	 */
	listen() {
		if (this.portConfig !== undefined) {
			this.port = this.userconfig.getKey(this.portConfig)
		}

		if (this.server === undefined) {
			try {
				const root = {
					0: new EmberModel.NumberedTreeNodeImpl(0, new EmberModel.EmberNodeImpl('Companion Tree'), {
						0: new EmberModel.NumberedTreeNodeImpl(0, new EmberModel.EmberNodeImpl('identity'), {
							0: new EmberModel.NumberedTreeNodeImpl(
								0,
								new EmberModel.ParameterImpl(EmberModel.ParameterType.String, 'product', undefined, 'Companion')
							),
							1: new EmberModel.NumberedTreeNodeImpl(
								1,
								new EmberModel.ParameterImpl(EmberModel.ParameterType.String, 'company', undefined, 'Bitfocus AS')
							),
							2: new EmberModel.NumberedTreeNodeImpl(
								2,
								new EmberModel.ParameterImpl(
									EmberModel.ParameterType.String,
									'version',
									undefined,
									this.registry.appVersion
								)
							),
							3: new EmberModel.NumberedTreeNodeImpl(
								3,
								new EmberModel.ParameterImpl(
									EmberModel.ParameterType.String,
									'build',
									undefined,
									this.registry.appBuild
								)
							),
						}),
						1: new EmberModel.NumberedTreeNodeImpl(1, new EmberModel.EmberNodeImpl('pages'), this.#getPagesTree()),
					}),
				}

				this.server = new EmberServer(this.port)
				this.server.on('error', this.handleSocketError.bind(this))
				this.server.onSetValue = this.setValue.bind(this)
				this.server.init(root)
				this.logger.info('Listening on port ' + this.port)
				this.logger.silly('Listening on port ' + this.port)
			} catch (e) {
				this.logger.error(`Could not launch: ${e.message}`)
			}
		}
	}

	/**
	 * Process a received command
	 * @param {Object} parameter - the raw path
	 * @param {(string|number|boolean)} value - the new value
	 * @returns {Promise<boolean>} - <code>true</code> if the command was successfully parsed
	 */
	async setValue(parameter, value) {
		const path = getPath(parameter)

		const pathInfo = path.split('.')
		// Check in the pages tree
		if (pathInfo[0] === '0' && pathInfo[1] === '1' && pathInfo.length === 5) {
			const page = parseInt(pathInfo[2])
			const bank = parseInt(pathInfo[3])
			const node = parseInt(pathInfo[4])

			if (isNaN(page) || isNaN(bank) || isNaN(node)) return false
			if (page < 0 || page > 100) return false

			const controlId = CreateBankControlId(page, bank)

			switch (node) {
				case NODE_STATE: {
					this.logger.silly(`Change bank ${controlId} pressed to ${value}`)

					this.controls.pressControl(controlId, !!value, `emberplus`)
					this.server.update(parameter, { value })
					return true
				}
				case NODE_TEXT: {
					this.logger.silly(`Change bank ${controlId} text to ${value}`)

					const control = this.controls.getControl(controlId)
					if (control && typeof control.styleSetFields === 'function') {
						control.styleSetFields({ text: value })

						// Note: this will be replaced shortly after with the value with feedbacks applied
						this.server.update(parameter, { value })
						return true
					}
					return false
				}
				case NODE_TEXT_COLOR: {
					const color = parseHexColor(value)
					this.logger.silly(`Change bank ${controlId} text color to ${value} (${color})`)

					const control = this.controls.getControl(controlId)
					if (control && typeof control.styleSetFields === 'function') {
						control.styleSetFields({ color: color })

						// Note: this will be replaced shortly after with the value with feedbacks applied
						this.server.update(parameter, { value })
						return true
					}
					return false
				}
				case NODE_BG_COLOR: {
					const color = parseHexColor(value)
					this.logger.silly(`Change bank ${controlId} background color to ${value} (${color})`)

					const control = this.controls.getControl(controlId)
					if (control && typeof control.styleSetFields === 'function') {
						control.styleSetFields({ bgcolor: color })

						// Note: this will be replaced shortly after with the value with feedbacks applied
						this.server.update(parameter, { value })
						return true
					}
					return false
				}
			}
		}

		return false
	}

	/**
	 * Send the latest bank state to the page/bank indicated
	 * @param {number} page - the page number
	 * @param {number} bank - the bank number
	 * @param {number} state - the state
	 * @param {string} deviceid - checks the <code>deviceid</code> to ensure that Ember+ doesn't loop its own state change back
	 */
	updateBankState(page, bank, state, deviceid) {
		if (!this.server) return
		if (deviceid === 'emberplus') return

		this.pushedButtons[page + '_' + bank] = state

		this.#updateNodePath(buildPathForButton(page, bank, NODE_STATE), state)
	}

	/**
	 * Send the latest bank text to the page/bank indicated
	 * @param {number} page - the page number
	 * @param {number} bank - the bank number
	 */
	#updateBankFromRender(page, bank, render) {
		if (!this.server) return
		//this.logger.info(`Updating ${page}.${bank} label ${this.banks[page][bank].text}`)

		// Update ember+ with internal state of button
		this.#updateNodePath(buildPathForButton(page, bank, NODE_TEXT), render.style?.text || '')
		this.#updateNodePath(buildPathForButton(page, bank, NODE_TEXT_COLOR), formatColorAsHex(render.style?.color || 0))
		this.#updateNodePath(buildPathForButton(page, bank, NODE_BG_COLOR), formatColorAsHex(render.style?.bgcolor || 0))
	}

	#updateNodePath(path, newValue) {
		const node = this.server.getElementByPath(path)

		if (node && node.contents.value !== newValue) {
			this.server.update(node, { value: newValue })
		}
	}
}

export default ServiceEmberPlus
