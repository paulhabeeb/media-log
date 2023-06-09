// Get a decade from a year
const getDecade = date => Math.floor(date / 10) * 10 + 's'

// Get search params from window URL bar
const getFilterParams = () => {
    const url = new URL(window.location.href)
    return url.searchParams
}

// Position dropdown correctly if it's out of the window bounds
const positionDropdown = filter => {
    const dropdown = filter.querySelector('.filterOptions')
    const dropdownRect = dropdown.getBoundingClientRect()
    const outOnRightSide =
        dropdownRect.x + dropdownRect.width > window.innerWidth

    dropdown.style.left = outOnRightSide ? 'initial' : '0px'
    dropdown.style.right = outOnRightSide ? '0px' : 'initial'
}

// Add listeners to filters at top of list log so filters will open
const addOpenCloseListeners = () => {
    const filters = document.getElementsByClassName('filterWrapper')

    for (let filter of filters) {
        const button = filter.querySelector('.filterTitle')
        button.addEventListener('click', () => {
            filter.classList.toggle('isOpen')
            positionDropdown(filter)
        })

        // Close the filter if the user clicks outside of it
        document.addEventListener('click', () => {
            const isClickInside = filter.contains(event.target)

            if (!isClickInside) {
                filter.classList.remove('isOpen')
            }
        })
    }

    // For mobile, show filters when tapping Show Filters button
    document.querySelector('.showFilters').addEventListener('click', () => {
        document.querySelector('.logFilters').classList.add('isOpen')
        document.documentElement.classList.add('filtersOpen')
    })

    document.querySelector('.hideFilters').addEventListener('click', () => {
        document.querySelector('.logFilters').classList.remove('isOpen')
        document.documentElement.classList.remove('filtersOpen')
    })
}

// On mobile there's a header breaking up the months of the year. Hide
// it if none of that month's log items are displayed after being filtered.
const updateMobileMonths = () => {
    const months = document.querySelectorAll('[data-month-year]')

    months.forEach(monthItem => {
        const monthYear = monthItem.dataset.monthYear
        const logItems = document.querySelectorAll(`[data-year="${monthYear}"]`)
        const hasVisible = Array.from(logItems).some(
            item =>
                item.dataset.year === monthYear &&
                !item.classList.contains('isHidden')
        )

        if (!hasVisible) {
            monthItem.classList.add('isHidden')
        } else {
            monthItem.classList.remove('isHidden')
        }

        // Apply a class to the first visible log item from this month so
        // it won't have a top border for styling purposes
        for (let i = 0; i < logItems.length; i++) {
            if (!logItems[i].classList.contains('isHidden')) {
                logItems[i].classList.add('firstVisible')
                break
            }
        }
    })
}

// Loop through selected filters to get matching log items. Return
// false if the log item doesn't match all the filters. Return true
// if it matches them all.
const loopFiltersForMatch = (filters, dataset) => {
    for (const [type, value] of filters) {
        if (type === 'genre') {
            // Genres is listed as a comma-separated string, so we
            // split that into an array we can loop
            const genres = dataset.genre.split(',')

            if (!genres.some(genre => value === genre)) {
                return false
            }
        } else {
            const rawItemValue = dataset[type]
            let logItemValue = ''

            if (type === 'decade') {
                logItemValue = getDecade(parseInt(rawItemValue))
            } else if (type === 'year') {
                const yearOnly = rawItemValue.slice(
                    0,
                    rawItemValue.indexOf('-')
                )
                logItemValue = yearOnly
            } else {
                logItemValue = rawItemValue
            }

            if (value !== logItemValue) {
                return false
            }
        }
    }

    return true
}

// Display only log items that match the selected filter(s)
const filterLogItems = () => {
    const logItems = document.getElementsByClassName('logItem')

    for (let item of logItems) {
        const filters = getFilterParams().entries()
        const matches = loopFiltersForMatch(filters, item.dataset)

        if (!matches) {
            item.classList.add('isHidden')
        } else {
            item.classList.remove('isHidden')
        }
    }

    updateMobileMonths()
}

// Set the location in the URL bar to match the selected filters.
// E.g., /filters/?genre=crime&decade=1960s&media=movie
const updateUrl = (type = null, value = null) => {
    const clearFilters = type === null
    const url = clearFilters
        ? new URL(window.location.origin)
        : new URL(`/filters/${window.location.search}`, window.location.origin)

    // If a filter of this type is already selected, then replace it.
    // E.g., if we have ?genre=romance and we just clicked documentary,
    // make the url ?genre=documentary.
    if (url.searchParams.has(type) && value === 'all') {
        url.searchParams.delete(type)
    } else if (url.searchParams.has(type)) {
        url.searchParams.set(type, value)
    } else if (type !== null && value !== 'all') {
        url.searchParams.append(type, value)
    }

    // The homepage shows only the first 100 log items, but the filter pages
    // show all 1000+ and show/hide them based on the filters. This helps keep
    // the number of DOM nodes low and page load times manageable. But that
    // means we need to navigate to a new page when enabling the first filter or
    // when clearing all the filters.
    if (!window.location.pathname.includes('/filters/') || clearFilters) {
        window.location.href = url
    } else {
        window.history.pushState(null, document.title, url)
        window.dispatchEvent(new Event('popstate'))
    }
}

// Replace the filter title with the active filter
const updateFilterTitle = (enable, type, value) => {
    const titles = document.querySelectorAll('[data-title-type]')

    titles.forEach(title => {
        if (title.dataset.titleType === type) {
            const baseTitle = title.querySelector('.baseTitle')
            const activeTitle = `isActive-${type}`
            let innerHTML = ''

            if (enable) {
                title.classList.add(activeTitle)
                baseTitle.classList.add('isHidden')
                innerHTML = document.querySelector(
                    `[data-filter-value="${value}"]`
                ).innerHTML
            } else {
                title.classList.remove(activeTitle)
                baseTitle.classList.remove('isHidden')
            }

            title.querySelector('.selectedTitle').innerHTML = innerHTML
        }
    })
}

// In the dropdown menus, highlight the currenly selected filters
const highlightSelectedFilters = () => {
    const filterOptions = document.querySelectorAll('[data-filter-type]')

    filterOptions.forEach(option => {
        const enabledFilters = getFilterParams()
        const keys = Array.from(enabledFilters.keys())
        const { filterType, filterValue } = option.dataset

        // If the user clicked "All Media" or something like that, to clear the
        // filters, then the URL won't include that filter. So we need to take
        // special care to disable the selected filters when this happens, or else
        // the last selected filter will remain highlighted.
        const filterExists = keys.includes(filterType)

        let enable = true
        if (!filterExists || enabledFilters.get(filterType) !== filterValue) {
            enable = false
        }

        if (enable) {
            option.classList.add('isActive')
            updateFilterTitle(enable, filterType, filterValue)
        } else {
            option.classList.remove('isActive')

            if (!filterExists) {
                updateFilterTitle(filterExists, filterType, filterValue)
            }
        }
    })
}

const addClearFilterListener = () => {
    document.querySelector('.clearFilters')?.addEventListener('click', () => {
        updateUrl()
    })
}

// Show a string of active filters
const showActiveFilters = () => {
    const enabledFilters = getFilterParams().entries()
    let consumedVerb = 'consumed'
    let decade = ''
    let genre = ''
    let media = ' stuff'
    let year = ''
    let i = 0

    for (const [type, value] of enabledFilters) {
        if (type === 'decade') {
            decade = ` from the <span class="activeDecade">${value}</span>`
        }
        if (type === 'genre') {
            let genreName = value

            if (value === 'sci-fi-and-fantasy') {
                genreName = 'sci-fi & fantasy'
            }
            if (value === 'science-fiction') {
                genreName = 'science fiction'
            }
            if (value === 'tv-movie') {
                genreName = 'television'
            }

            genre += `<span class="activeGenre"> ${genreName}</span>`
        }
        if (type === 'media') {
            media = '<span class="activeMedia"> '
            media += value === 'tv-show' ? 'tv shows' : `${value}s`
            media += '</span>'

            if (value === 'book') {
                consumedVerb = 'read'
            }
            if (value === 'movie' || value === 'tv-show') {
                consumedVerb = 'watched'
            }
        }
        if (type === 'year') {
            year = ` in <span class="activeYear">${value}</span>`
        }

        i++
    }

    if (year !== '') {
        year = ` ${consumedVerb}${year}`
    }

    const htmlString = `Showing${genre}${media}${decade}${year}. <button class="clearFilters">Clear filters</button>`
    const html = i > 0 ? htmlString : ''

    document.querySelector('.activeFilters').innerHTML = html
    addClearFilterListener()
}

// Whenever the URL changes, whether when a filter is applied or when
// the user goes back and forth in the browser, reinitialize all the filters.
const addUrlChangeListener = () => {
    window.addEventListener('popstate', () => {
        initFilters()
    })
}

// Listen for clicks on a filter item
const addFilterItemListeners = () => {
    const filterItems = document.getElementsByClassName('filterItem')

    for (let item of filterItems) {
        item.addEventListener('click', event => {
            event.preventDefault()

            const { filterType, filterValue } = event.target.dataset
            updateUrl(filterType, filterValue)

            // Close the filter after selecting a value
            event.target.closest('.filterWrapper').classList.remove('isOpen')

            // For mobile, close the filters modal
            document.querySelector('.logFilters').classList.remove('isOpen')

            // Allow the document to scroll on mobile
            document.documentElement.classList.remove('filtersOpen')
        })
    }
}

const initFilters = () => {
    filterLogItems()
    highlightSelectedFilters()
    showActiveFilters()
}

document.addEventListener('DOMContentLoaded', () => {
    initFilters()
    addFilterItemListeners()
    addOpenCloseListeners()
    addClearFilterListener()
    addUrlChangeListener()
})
