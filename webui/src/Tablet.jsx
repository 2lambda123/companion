import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
	CreateBankControlId,
	LoadingRetryOrError,
	MyErrorBoundary,
	SocketContext,
	socketEmitPromise,
	useMountEffect,
} from './util'
import { CButton, CCol, CContainer, CForm, CFormGroup, CInput, CInputCheckbox, CRow, CSelect } from '@coreui/react'
import { nanoid } from 'nanoid'
import { MAX_COLS, MAX_ROWS } from './Constants'
import { BankPreview } from './Components/BankButton'
import { useInView } from 'react-intersection-observer'
import * as queryString from 'query-string'
import rangeParser from 'parse-numeric-range'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faArrowRight, faCog, faExpand } from '@fortawesome/free-solid-svg-icons'
import { useNavigate } from 'react-router-dom'
import { ButtonRenderCache, useSharedRenderCache } from './ButtonRenderCache'

function sanitisePageInfo(info) {
	const toNumArray = (raw) => {
		if (Array.isArray(raw)) {
			return raw.map((v) => Number(v))
		} else {
			return []
		}
	}

	return {
		...info,
		pageup: toNumArray(info.pageup),
		pagenum: toNumArray(info.pagenum),
		pagedown: toNumArray(info.pagedown),
	}
}

export function Tablet() {
	const socket = useContext(SocketContext)

	const [pages, setPages] = useState(null)
	const [loadError, setLoadError] = useState(null)

	const [queryUrl, setQueryUrl] = useState(window.location.search)
	const { orderedPages, parsedQuery } = useMemo(() => {
		const parsedQuery = queryString.parse(queryUrl)

		const pagesRange = rangeParser(parsedQuery.pages ?? '').filter((p) => p >= 1 && p <= 99)

		return {
			parsedQuery,
			orderedPages: pagesRange,
		}
	}, [queryUrl])

	const imageCache = useMemo(() => new ButtonRenderCache(socket), [socket]) // TODO - this isnt the safest

	const [retryToken, setRetryToken] = useState(nanoid())
	const doRetryLoad = useCallback(() => setRetryToken(nanoid()), [])
	useEffect(() => {
		setLoadError(null)
		setPages(null)

		socketEmitPromise(socket, 'web_buttons', [])
			.then((newPages) => {
				setLoadError(null)
				const newPages2 = {}
				for (const [id, info] of Object.entries(newPages)) {
					newPages2[id] = sanitisePageInfo(info)
				}
				setPages(newPages2)
			})
			.catch((e) => {
				console.error('Failed to load pages list:', e)
				setLoadError(`Failed to load pages list`)
				setPages(null)
			})

		const updatePageInfo = (page, info) => {
			setPages((oldPages) => {
				if (oldPages) {
					return {
						...oldPages,
						[page]: sanitisePageInfo(info),
					}
				} else {
					return null
				}
			})
		}

		socket.on('page_update_ext', updatePageInfo)

		return () => {
			socket.off('page_update_ext', updatePageInfo)
		}
	}, [retryToken, socket])

	useMountEffect(() => {
		const onConnect = () => {
			setRetryToken(nanoid())
		}
		socket.on('connect', onConnect)
		return () => {
			socket.off('connect', onConnect)
		}
	})

	const navigate = useNavigate()
	const updateQueryUrl = useCallback(
		(key, value) => {
			setQueryUrl((oldUrl) => {
				const newQuery = queryString.parse(oldUrl)
				if (value === '' || value === undefined || value === null || value === false) {
					delete newQuery[key]
				} else if (value === true) {
					newQuery[key] = 1
				} else {
					newQuery[key] = value
				}

				const newStr = queryString.stringify(newQuery).replaceAll('%2C', ',') // replace commas to make it readable
				navigate(`?${newStr}`)
				return newStr
			})
		},
		[setQueryUrl, navigate]
	)

	// Compile the list of pages we will be showing
	let validPages = orderedPages.filter((p) => pages && !!pages[p])
	if (validPages.length === 0) validPages = Object.keys(pages || {}).map((p) => Number(p))

	let cols = Number(parsedQuery['cols'])
	if (isNaN(cols) || cols <= 0) cols = MAX_COLS
	let rows = Number(parsedQuery['rows'])
	if (isNaN(rows) || rows <= 0) rows = MAX_ROWS

	const layout = parsedQuery['layout']
	return (
		<div className="page-tablet">
			<div className="scroller">
				<CContainer fluid className="d-flex flex-column">
					{pages ? (
						<>
							<ConfigurePanel updateQueryUrl={updateQueryUrl} query={parsedQuery} orderedPages={orderedPages} />
							{layout === 'cycle' ? (
								<CyclePages
									pages={pages}
									imageCache={imageCache}
									orderedPages={validPages}
									updateQueryUrl={updateQueryUrl}
									query={parsedQuery}
									cols={cols}
									rows={rows}
								/>
							) : (
								<InfinitePages
									pages={pages}
									imageCache={imageCache}
									orderedPages={validPages}
									query={parsedQuery}
									cols={cols}
									rows={rows}
								/>
							)}
						</>
					) : (
						<CRow className="flex-grow-1">
							<div className="cycle-layout">
								<div></div>
								<LoadingRetryOrError dataReady={false} error={loadError} doRetry={doRetryLoad} />
							</div>
						</CRow>
					)}
				</CContainer>
			</div>
		</div>
	)
}

function ConfigurePanel({ updateQueryUrl, query, orderedPages }) {
	const [show, setShow] = useState(false)
	const [fullscreen, setFullscreen] = useState(document.fullscreenElement !== null)

	useMountEffect(() => {
		const handleChange = () => setFullscreen(document.fullscreenElement !== null)

		document.addEventListener('fullscreenchange', handleChange)
		return () => {
			document.removeEventListener('fullscreenchange', handleChange)
		}
	})

	return show ? (
		<CRow className="configure">
			<CCol sm={12}>
				<h3>
					Configure Buttons View
					<CButton className="close-config" onClick={() => setShow(false)} title="Close">
						<FontAwesomeIcon icon={faCog} />
					</CButton>
				</h3>
				<CForm>
					<CRow>
						<CCol md={4} sm={6} xs={12}>
							<legend>Basic</legend>
							<CFormGroup>
								<label>Pages</label>
								<p>use 1..6 for ranges, and commas for multiple selections. Follows provided order</p>
								<CInput
									value={query['pages'] || ''}
									onChange={(e) => updateQueryUrl('pages', e.currentTarget.value)}
									placeholder={'1..99'}
								/>
							</CFormGroup>
							<CFormGroup>
								<label>Rows</label>
								<CInput
									type="number"
									min={1}
									max={MAX_ROWS}
									value={query['rows'] || MAX_ROWS}
									onChange={(e) => updateQueryUrl('rows', e.currentTarget.value)}
								/>
							</CFormGroup>
							<CFormGroup>
								<label>Columns</label>
								<CInput
									type="number"
									min={1}
									max={MAX_COLS}
									value={query['cols'] || MAX_COLS}
									onChange={(e) => updateQueryUrl('cols', e.currentTarget.value)}
								/>
							</CFormGroup>
						</CCol>
						<CCol md={4} sm={6} xs={12}>
							<legend>Layout</legend>
							<CFormGroup>
								<label>Layout</label>
								<CSelect
									value={query['layout'] || 'infinite'}
									onChange={(e) => updateQueryUrl('layout', e.currentTarget.value)}
								>
									<option value="cycle">Cycle</option>
									<option value="infinite">Infinite</option>
								</CSelect>
							</CFormGroup>
							<CFormGroup>
								<label>Hide configure button</label>
								<CInputCheckbox
									type="checkbox"
									checked={!!query['noconfigure']}
									value={true}
									onChange={(e) => updateQueryUrl('noconfigure', !!e.currentTarget.checked)}
								/>
							</CFormGroup>
							<CFormGroup>
								<label>Hide fullscreen button</label>
								<CInputCheckbox
									type="checkbox"
									checked={!!query['nofullscreen']}
									value={true}
									onChange={(e) => updateQueryUrl('nofullscreen', !!e.currentTarget.checked)}
								/>
							</CFormGroup>
						</CCol>

						{query['layout'] === 'cycle' ? (
							<>
								<CCol md={4} sm={6} xs={12}>
									<legend>Cycle</legend>
									<CFormGroup>
										<label>Loop pages</label>
										<CInputCheckbox
											type="checkbox"
											checked={!!query['loop']}
											value={true}
											onChange={(e) => updateQueryUrl('loop', !!e.currentTarget.checked)}
										/>
									</CFormGroup>
								</CCol>
							</>
						) : (
							<>
								<CCol md={4} sm={6} xs={12}>
									<legend>Infinite</legend>
									<CFormGroup>
										<label>Hide page headings</label>
										<CInputCheckbox
											type="checkbox"
											checked={!!query['noheadings']}
											value={true}
											onChange={(e) => updateQueryUrl('noheadings', !!e.currentTarget.checked)}
										/>
									</CFormGroup>
								</CCol>
							</>
						)}
					</CRow>
				</CForm>
			</CCol>
		</CRow>
	) : (
		<CRow className="header">
			<CCol xs={12}>
				{(!fullscreen || !query['noconfigure']) && !query['nofullscreen'] ? (
					<CButton onClick={() => document.documentElement.requestFullscreen()} title="Fullscreen">
						<FontAwesomeIcon icon={faExpand} />
					</CButton>
				) : (
					''
				)}
				{!query['noconfigure'] ? (
					<CButton className="open-config" onClick={() => setShow(true)} title="Configure">
						<FontAwesomeIcon icon={faCog} />
					</CButton>
				) : (
					''
				)}
			</CCol>
		</CRow>
	)
}

function clamp(val, max) {
	return Math.min(Math.max(0, val), max)
}

function CyclePages({ pages, imageCache, orderedPages, updateQueryUrl, query, cols, rows }) {
	const rawIndex = Number(query['index'])
	const loop = query['loop']
	const currentIndex = isNaN(rawIndex) ? 0 : clamp(rawIndex, orderedPages.length - 1)
	const currentPage = orderedPages[currentIndex]

	const setCurrentIndex = useCallback((newIndex) => updateQueryUrl('index', newIndex), [updateQueryUrl])

	{
		// Ensure next and prev pages are preloaded for more seamless cycling
		const prevPage = orderedPages[currentIndex - 1]
		useSharedRenderCache(imageCache, 'tablet:preload:prevPage', prevPage)
		const nextPage = orderedPages[currentIndex + 1]
		useSharedRenderCache(imageCache, 'tablet:preload:nextPage', nextPage)
	}

	const goPrevPage = useCallback(() => {
		if (currentIndex <= 0) {
			if (loop) {
				setCurrentIndex(orderedPages.length - 1)
			}
		} else {
			setCurrentIndex(currentIndex - 1)
		}
	}, [orderedPages, setCurrentIndex, currentIndex, loop])
	const goNextPage = useCallback(() => {
		if (currentIndex >= orderedPages.length - 1) {
			if (loop) {
				setCurrentIndex(0)
			}
		} else {
			setCurrentIndex(currentIndex + 1)
		}
	}, [orderedPages, setCurrentIndex, currentIndex, loop])
	const goFirstPage = useCallback(() => setCurrentIndex(0), [setCurrentIndex])

	return (
		<CRow className="flex-grow-1">
			<div className="cycle-layout">
				<MyErrorBoundary>
					{/* <div></div> */}
					<div className="cycle-heading">
						<h1 id={`page_${currentPage}`}>
							{pages[currentPage]?.name || ' '}

							{orderedPages.length > 1 ? (
								<>
									<CButton onClick={goNextPage} disabled={!loop && currentIndex === orderedPages.length - 1} size="lg">
										<FontAwesomeIcon icon={faArrowRight} />
									</CButton>
									<CButton onClick={goPrevPage} disabled={!loop && currentIndex === 0} size="lg">
										<FontAwesomeIcon icon={faArrowLeft} />
									</CButton>
								</>
							) : (
								''
							)}
						</h1>
					</div>
					<div>
						<ButtonGrid
							// No key, we want to reuse the grid as the page changes
							imageCache={imageCache}
							number={currentPage}
							cols={cols}
							rows={rows}
							pageInfo={pages[currentPage]}
							goFirstPage={goFirstPage}
							goNextPage={goNextPage}
							goPrevPage={goPrevPage}
						/>
					</div>
				</MyErrorBoundary>
			</div>
		</CRow>
	)
}

function InfinitePages({ pages, imageCache, orderedPages, query, cols, rows }) {
	const noHeadings = query['noheadings']

	const pageElements = orderedPages.map((number, i) => (
		<MyErrorBoundary key={i}>
			<div id={`index_${number}`}>
				{!noHeadings ? (
					<CRow>
						<h1>{pages[number]?.name}</h1>
					</CRow>
				) : (
					''
				)}
				<CRow>
					<ButtonGrid imageCache={imageCache} number={number} cols={cols} rows={rows} pageInfo={pages[number]} />
				</CRow>
			</div>
		</MyErrorBoundary>
	))

	return <>{pageElements}</>
}

function ButtonGrid({ imageCache, number, cols, rows, goFirstPage, goNextPage, goPrevPage, pageInfo }) {
	const socket = useContext(SocketContext)

	const { ref, inView } = useInView({
		rootMargin: '50%',
		/* Optional options */
		threshold: 0,
	})

	const images = useSharedRenderCache(imageCache, 'tablet', number, !inView)

	const bankClick = useCallback(
		(bank, pressed) => {
			if (goNextPage && pressed && pageInfo && pageInfo.pageup && pageInfo.pageup.includes(bank)) {
				goNextPage()
			} else if (goPrevPage && pressed && pageInfo && pageInfo.pagedown && pageInfo.pagedown.includes(bank)) {
				goPrevPage()
			} else if (goFirstPage && pressed && pageInfo && pageInfo.pagenum && pageInfo.pagenum.includes(bank)) {
				goFirstPage()
			} else {
				const controlId = CreateBankControlId(number, bank)
				socketEmitPromise(socket, 'controls:hot-press', [controlId, pressed]).catch((e) =>
					console.error(`Hot press failed: ${e}`)
				)
			}
		},
		[socket, number, pageInfo, goNextPage, goPrevPage, goFirstPage]
	)

	return (
		<div ref={ref} className="bankgrid">
			{' '}
			{Array(Math.min(MAX_ROWS, rows))
				.fill(0)
				.map((_, y) => {
					return (
						<CCol key={y} sm={12} className="pagebank-row">
							{Array(Math.min(MAX_COLS, cols))
								.fill(0)
								.map((_2, x) => {
									const index = y * MAX_COLS + x + 1
									return (
										<BankPreview
											key={x}
											page={number}
											index={index}
											preview={images[index]}
											onClick={bankClick}
											alt={`Bank ${index}`}
											selected={false}
										/>
									)
								})}
						</CCol>
					)
				})}
		</div>
	)
}
