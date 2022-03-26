import slugify from 'slugify'

// Convert a string to a slgu
const toSlug = string =>
    slugify(string, {
        lower: true,
        strict: true,
    })

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

            if (!genres.some(genre => value === toSlug(genre))) {
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
                logItemValue = toSlug(yearOnly)
            } else {
                logItemValue = toSlug(rawItemValue)
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
// E.g., ?genre=crime&decade=1960s&media=movie
const updateUrl = (type, value, filterLogItems) => {
    const url =
        type === null
            ? new URL(window.location.origin)
            : new URL(window.location.href)

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

    window.history.pushState(null, document.title, url)
    filterLogItems()
}

// Replace the filter title with the active filter
const updateFilterTitle = (enable, type, value) => {
    const titles = document.querySelectorAll('[data-title-type]')

    titles.forEach(title => {
        if (title.dataset.titleType === type) {
            const baseTitle = title.querySelector('.baseTitle')
            let innerHTML = ''

            if (enable) {
                baseTitle.classList.add('isHidden')
                innerHTML = document.querySelector(
                    `[data-filter-value="${value}"]`
                ).innerHTML
            } else {
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
        updateUrl(null, null, filterLogItems)
        highlightSelectedFilters()
        showActiveFilters()
    })
}

// Show a string of active filters
const showActiveFilters = () => {
    const enabledFilters = getFilterParams().entries()
    let consumedVerb = 'consumed'
    let decade = ''
    let genre = ''
    let media = ' log items'
    let year = ''
    let i = 0

    for (const [type, value] of enabledFilters) {
        if (type === 'decade') {
            decade = ` from the <span class="activeDecade">${value}</span>`
        }
        if (type === 'genre') {
            genre += '<span class="activeGenre">'
            genre += `${value} `

            if (value === 'sci-fi-and-fantasy') {
                genre = ' sci-fi & fantasy'
            }
            if (value === 'science-fiction') {
                genre = ' science fiction'
            }

            genre += '</span>'
        }
        if (type === 'media') {
            media = '<span class="activeMedia">'
            media += value === 'tv-show' ? ' tv shows' : ` ${value}s`
            media += '</span>'

            if (value === 'book') {
                consumedVerb = 'read'
            }
            if (value === 'movie' || value === 'tv-show') {
                consumedVerb = 'watched'
            }
        }
        if (type === 'year') {
            year = ` ${consumedVerb} in <span class="activeYear">${value}</span>`
        }

        i++
    }

    const htmlString = `Showing${genre}${media}${decade}${year}. <button class="clearFilters">Clear filters</button>`
    const html = i > 0 ? htmlString : ''

    document.querySelector('.activeFilters').innerHTML = html
    addClearFilterListener()
}

// Listen for clicks on a filter item
const addFilterItemListeners = () => {
    const filterItems = document.getElementsByClassName('filterItem')

    for (let item of filterItems) {
        item.addEventListener('click', event => {
            event.preventDefault()
            const { filterType, filterValue } = event.target.dataset

            updateUrl(filterType, filterValue, filterLogItems)
            highlightSelectedFilters()
            showActiveFilters()

            // Close the filter after selecting a value
            event.target.closest('.filterWrapper').classList.remove('isOpen')

            // For mobile, close the filters modal
            document.querySelector('.logFilters').classList.remove('isOpen')

            // Allow the document to scroll on mobile
            document.documentElement.classList.remove('filtersOpen')
        })
    }
}

document.addEventListener('DOMContentLoaded', () => {
    filterLogItems()
    highlightSelectedFilters()
    showActiveFilters()
    addOpenCloseListeners()
    addFilterItemListeners()
    addClearFilterListener()
})
