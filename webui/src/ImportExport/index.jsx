import React, { useCallback, useContext, useRef, useState } from 'react'
import { InstancesContext, SocketContext, socketEmitPromise } from '../util'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload, faFileImport, faTrashAlt } from '@fortawesome/free-solid-svg-icons'
import { CAlert, CButton } from '@coreui/react'
import { ResetWizardModal } from './Reset'
import { ExportWizardModal } from './Export'
import { ImportWizard } from './Import'

export function ImportExport() {
	const socket = useContext(SocketContext)
	const instancesContext = useContext(InstancesContext)

	const [loadError, setLoadError] = useState(null)

	const resetRef = useRef(null)
	const exportRef = useRef(null)
	const doReset = useCallback(() => resetRef.current.show(), [])
	const doExport = useCallback(() => exportRef.current.show(), [])

	const [importInfo, setImportInfo] = useState(null)
	const clearImport = useCallback(() => {
		setImportInfo(null)

		socketEmitPromise(socket, 'loadsave:abort', []).catch((e) => {
			console.error('Failed to abort import', e)
		})
	}, [socket])

	const fileApiIsSupported = !!(window.File && window.FileReader && window.FileList && window.Blob)

	const loadSnapshot = useCallback(
		(e) => {
			const newFile = e.currentTarget.files?.[0]
			e.currentTarget.value = null

			if (newFile === undefined || newFile.type === undefined) {
				setLoadError('Unable to read config file')
				return
			}

			var fr = new FileReader()
			fr.onload = () => {
				setLoadError(null)
				socketEmitPromise(socket, 'loadsave:prepare-import', [fr.result], 20000)
					.then(([err, config]) => {
						if (err) {
							setLoadError(err)
						} else {
							const initialRemap = {}

							// Figure out some initial mappings. Look for matching type and hopefully label
							for (const [id, obj] of Object.entries(config.instances)) {
								const candidateIds = []
								let matchingLabelId = ''

								for (const [otherId, otherObj] of Object.entries(instancesContext)) {
									if (otherObj.instance_type === obj.instance_type) {
										candidateIds.push(otherId)
										if (otherObj.label === obj.label) {
											matchingLabelId = otherId
										}
									}
								}

								if (matchingLabelId) {
									initialRemap[id] = matchingLabelId
								} else {
									initialRemap[id] = candidateIds[0] || ''
								}
							}

							setLoadError(null)
							// const mode = config.type === 'page' ? 'import_page' : 'import_full'
							// modalRef.current.show(mode, config, initialRemap)
							setImportInfo([config, initialRemap])
						}
					})
					.catch((e) => {
						setLoadError('Failed to load config to import')
						console.error('Failed to load config to import:', e)
					})
			}
			fr.readAsText(newFile)
		},
		[socket, instancesContext]
	)

	if (importInfo) {
		return <ImportWizard importInfo={importInfo} clearImport={clearImport} />
	}

	return (
		<>
			<ResetWizardModal ref={resetRef} />
			<ExportWizardModal ref={exportRef} />

			<h5>Import configuration</h5>
			{!fileApiIsSupported ? (
				<>
					<CAlert color="warning">File uploading is not supported in your browser</CAlert>
				</>
			) : (
				<>
					<p>
						Use the button below to browse your computer for a <b>.companionconfig</b> file containing a configuration
						set.
					</p>

					<p>
						{loadError ? <CAlert color="warning">{loadError}</CAlert> : ''}

						<label className="btn btn-success btn-file">
							<FontAwesomeIcon icon={faFileImport} /> Import
							<input type="file" onChange={loadSnapshot} style={{ display: 'none' }} />
						</label>
					</p>
				</>
			)}
			<hr />
			<h5>Export configuration</h5>
			<p>Download a file containing all connections and button pages.</p>
			<CButton color="success" onClick={doExport}>
				<FontAwesomeIcon icon={faDownload} /> Export
			</CButton>
			<hr />
			<h5>Reset configuration</h5>
			<p>This will clear all connections, triggers and/or buttons.</p>
			<p>
				<CButton color="danger" style={{ backgroundColor: 'rgba(180,0,0,1)' }} onClick={doReset}>
					<FontAwesomeIcon icon={faTrashAlt} /> Reset Configuration
				</CButton>
			</p>
		</>
	)
}
