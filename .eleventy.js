const path = require('path')
const fs = require('fs')
const htmlmin = require('html-minifier')
const slugify = require('slugify')
const { DateTime } = require('luxon')
const pluginNavigation = require('@11ty/eleventy-navigation')
const pluginRss = require('@11ty/eleventy-plugin-rss')

module.exports = function (eleventyConfig) {
    // Add plugins
    eleventyConfig.addPlugin(pluginNavigation)
    eleventyConfig.addPlugin(pluginRss)

    // For debugging
    eleventyConfig.addFilter('logger', value => {
        console.log(value)
    })

    // Get the contents of an svg file so we can include it in
    // the outputted HTML of a shortcode.
    const getSvgContent = file => {
        const path = `./src/_includes/svg/${file}.svg`
        const data = fs.readFileSync(path, (err, contents) => {
            if (err) {
                return err
            }

            return contents
        })

        return data.toString('utf8')
    }

    // Various date formats
    const getDateTime = date =>
        DateTime.fromISO(date, { zone: 'America/New_York' })
    const getDayOnly = date => getDateTime(date).toFormat('dd')
    const getHtmlDateString = date => getDateTime(date).toFormat('yyyy-LL-dd')
    const getReadableDate = date => getDateTime(date).toFormat('dd LLLL yyyy')
    const getReadableYearAndMonth = date =>
        getDateTime(date).toFormat('LLLL yyyy')
    const getYearMonth = date => getDateTime(date).toFormat('yyyy-LL')
    const getYearOnly = date => getDateTime(date).toFormat('yyyy')

    eleventyConfig.addFilter('dayOnly', getDayOnly)
    eleventyConfig.addFilter('readableDate', getReadableDate)
    eleventyConfig.addFilter('readableYearAndMonth', getReadableYearAndMonth)
    eleventyConfig.addFilter('yearAndMonth', getYearMonth)
    eleventyConfig.addFilter('yearOnly', getYearOnly)
    eleventyConfig.addFilter('htmlDateString', getHtmlDateString)

    /*
     * Format a post title, either in the log list or a post page, so it uses
     * the original language, if that language is French or Italian. If the post
     * type is TV Show, list the season and episode, too.
     */
    eleventyConfig.addFilter(
        'postTitle',
        (title, origTitle, origLang, season, episode) => {
            let newTitle = title
            let seasonEpisode = ''

            if (origTitle && (origLang === 'fr' || origLang === 'it')) {
                newTitle = origTitle
            }
            if (season && episode) {
                seasonEpisode = ` (S${season}E${episode})`
            }

            return `${newTitle}${seasonEpisode}`
        }
    )

    /*
     * In the details section of a post page, print a detail section that's an array
     */
    eleventyConfig.addShortcode('printArray', (array, title, pluralTitle) => {
        let html = ''

        if (Array.isArray(array) && array.length > 1) {
            html += `<dt>${pluralTitle}</dt>`
            html += '<div>'
            array.forEach(item => {
                html += `<dd>${item}</dd>`
            })
            html += '</div>'
        } else if (array[0] !== undefined) {
            html += `<dt>${title}</dt>`
            html += `<dd>${array[0]}</dd>`
        }

        return html
    })

    /*
     * Add filters to main log
     */
    const getDecade = date => Math.floor(getYearOnly(date) / 10) * 10 + 's'
    const sortAsc = (a, b) => {
        if (a < b) return -1
        if (a > b) return 1
        return 0
    }
    const getUniques = (arr, isDesc = false) => {
        const sorted = isDesc ? arr.sort(sortAsc).reverse() : arr.sort(sortAsc)

        return [...new Set(sorted)]
    }
    const toSlug = string =>
        slugify(string, {
            lower: true,
            strict: true,
        })
    const addFilter = (title, data) => {
        const titleSlug = toSlug(title)
        const pluralTitle = title === 'Media' ? title : `${title}s`

        let html = `<div class="filterWrapper">`
        html += `<h2 class="filterTitle" data-title-type="${titleSlug}"><span class="baseTitle">${title}</span><span class="selectedTitle"></span></h2>`
        html += '<ul class="filterOptions">'
        html += `<li><button class="filterItem" data-filter-type="${titleSlug}" data-filter-value="all">All ${pluralTitle}</button></li>`
        data.forEach(item => {
            if (!item) return null

            const itemSlug = toSlug(item)
            html += `<li><button class="filterItem" data-filter-type="${titleSlug}" data-filter-value="${itemSlug}">${item}</button></li>`
        })
        html += `</ul></div>`

        return html
    }

    eleventyConfig.addShortcode('getFilters', posts => {
        const media = []
        const years = []
        const decades = []
        const genres = []

        posts.forEach(post => {
            media.push(post.media)
            years.push(getYearOnly(post.date))
            decades.push(getDecade(post.release))
            genres.push(post.genre)
        })

        const uniqueMedia = getUniques(media)
        const uniqueYears = getUniques(years, true)
        const uniqueDecades = getUniques(decades, true)
        const uniqueGenres = getUniques(genres.flat())

        let html = `<button class="showFilters">Filter ${getSvgContent(
            'filter'
        )}</button>`
        html += '<aside class="logFilters">'
        html += '<div class="hideFiltersWrapper">Filter'
        html += '<button class="hideFilters">&times;</button>'
        html += '</div>'
        html += addFilter('Media', uniqueMedia)
        html += addFilter('Year', uniqueYears)
        html += addFilter('Decade', uniqueDecades)
        html += addFilter('Genre', uniqueGenres)
        html += '</aside>'
        html += '<div class="activeFilters"></div>'

        return html
    })

    /*
     * Create collections for filter pages
     */
    const getFilterCollection = (collection, showIncomplete = false) => {
        const posts = collection.getFilteredByTag('posts')
        const filteredPosts = []

        for (let post of posts) {
            if (!post.date && showIncomplete) {
                filteredPosts.push(post)
            }
            if (post.date && !showIncomplete) {
                filteredPosts.push(post)
            }
        }

        return filteredPosts
    }
    eleventyConfig.addCollection('inProgressEntries', collection =>
        getFilterCollection(collection, true)
    )
    eleventyConfig.addCollection('completeEntries', collection =>
        getFilterCollection(collection)
    )

    /*
     * Functions for creating a list of log posts
     */

    // Print the creator's name in different ways depending on
    // how many creators there are.
    const getCreator = creators => {
        let creatorString = ''

        if (creators.length > 2) {
            creators.forEach((creator, index) => {
                if (index + 1 === creators.length) {
                    creatorString += `and ${creator}`
                } else {
                    creatorString += `${creator}, `
                }
            })
        } else if (creators.length === 2) {
            creatorString = `${creators[0]} and ${creators[1]}`
        } else {
            creatorString = creators?.[0] || ''
        }

        return creatorString
    }

    // Create log list item
    const getPostListItem = post => {
        const title = eleventyConfig.getFilter('postTitle')(
            post.title,
            post.original_title,
            post.original_language,
            post.season,
            post.episode
        )
        const url = eleventyConfig.getFilter('url')(post.url)
        const decadeYear = getYearOnly(post.release)
        const genres = post?.genre?.map(genre => toSlug(genre)).toString() || ''
        const media = toSlug(post.media)
        const year = getYearMonth(post.date)

        let html = `<li class="logItem" data-decade="${decadeYear}" data-genre="${genres}" data-media="${media}" data-year="${year}">`
        html += `<time class="logItem-date" datetime="${getHtmlDateString(
            post.date
        )}">${getDayOnly(post.date)}</time>`
        html += '<div class="logItem-title">'
        html += `<a href="${url}">${title}</a>`
        html += `<span class="logItem-mobileYearCreated">${decadeYear}</span>`
        html += '</div>'
        html += `<div class="logItem-creator">${getCreator(post.creator)}</div>`
        html += `<div class="logItem-yearCreated">${decadeYear}</div>`

        if (post.revisit) {
            const icon = getSvgContent('revisit')
            html += `<div class="icon-rewatch logItem-rewatch">${icon}</div>`
        }

        html += '</li>'

        return html
    }

    // Split up an array of posts into sub-arrays of months. E.g., all posts from
    // May 2020 will be in an array, and all posts from April 2020 will be in another.
    const separatePostsByMonth = posts => {
        const months = posts.map(post => getYearMonth(post.date))
        const uniqueMonths = [...new Set(months)]

        const postsByMonth = uniqueMonths.reduce((prev, month) => {
            // If the posts match the current month
            const filteredPosts = posts.filter(
                post => getYearMonth(post.date) === month
            )

            return [...prev, filteredPosts]
        }, [])

        return postsByMonth
    }

    // Display list of all log posts, optionally filtering them
    eleventyConfig.addShortcode('getPostsByFilter', posts => {
        const postsByMonth = separatePostsByMonth(posts)

        let html = '<ul class="log">'
        postsByMonth.forEach(month => {
            month.forEach((post, index) => {
                const isFirst = index === 0

                if (isFirst) {
                    html += `<li class="monthAndYear" data-month-year="${getYearMonth(
                        post.date
                    )}"><span>${getReadableYearAndMonth(post.date)}</span></li>`
                }

                html += getPostListItem(post)
            })
        })
        html += '</ul>'

        return html
    })

    /*
     * Paginate the main log
     */
    // Get Newer/Older buttons
    const getOlderNewerButton = (link, title) => {
        let html = '<div>'

        if (link) {
            html += `<a class="paginationButton" href="${link}">${title}</a>`
        } else {
            html += `<span class="paginationButton invisiblePaginationButton">${title}</span>`
        }

        html += '</div>'

        return html
    }

    // Get links for main numbered pagination
    const getPaginationLink = (pageNum, links, hideOnMobile = false) => {
        const className = hideOnMobile ? ' class="hideOnMobile"' : ''

        return `<li${className}><a href="${
            links[pageNum - 1]
        }">${pageNum}</a></li>`
    }

    eleventyConfig.addShortcode('getLogPagination', pagination => {
        const page = pagination.pageNumber + 1
        const totalPages = pagination.hrefs.length

        let html = '<nav class="pagination">'
        html += getOlderNewerButton(pagination.href.previous, 'Newer')
        html += '<ol class="pageList">'

        if (page > 1) {
            html += getPaginationLink(1, pagination.hrefs, true)
        }
        if (page - 2 > 1) {
            if (page - 3 > 1) {
                html += '<li class="hideOnMobile">...</li>'
            }

            html += getPaginationLink(page - 2, pagination.hrefs)
        }
        if (page - 1 > 1) {
            html += getPaginationLink(page - 1, pagination.hrefs)
        }
        html += `<li class='currentPage'>${page}</li>`
        if (page + 1 < totalPages) {
            html += getPaginationLink(page + 1, pagination.hrefs)
        }
        if (page + 2 < totalPages) {
            html += getPaginationLink(page + 2, pagination.hrefs)

            if (page + 3 < totalPages) {
                html += '<li class="hideOnMobile">...</li>'
            }
        }
        if (page < totalPages) {
            html += getPaginationLink(totalPages, pagination.hrefs, true)
        }

        html += '</ol>'
        html += getOlderNewerButton(pagination.href.next, 'Older')
        html += '</nav>'

        return html
    })

    /*
     * Retrieve previous views/reads to list on individual post pages
     */
    eleventyConfig.addShortcode('getPreviousViews', (url, posts) => {
        const { creator, date, episode, media, release, season, title } =
            posts.find(p => p.url === url)

        const filteredPosts = posts.filter(
            data =>
                data.title === title &&
                JSON.stringify(data.creator) === JSON.stringify(creator) &&
                getReadableDate(data.release) === getReadableDate(release) &&
                data.media === media &&
                data.date !== date &&
                (media !== 'TV Show' ||
                    (media === 'TV Show' &&
                        data.season === season &&
                        data.episode === episode))
        )

        let html = ''

        if (filteredPosts.length > 0) {
            html = '<dt>Other visits</dt><div>'
            filteredPosts.forEach(p => {
                const date = getReadableDate(p.date)
                html += `<dd><a href="${p.url}">${date}</a></dd>`
            })
            html += '</div>'
        }

        return html
    })

    // Minify HTML
    eleventyConfig.addTransform('htmlmin', (content, outputPath) => {
        if (outputPath && outputPath.endsWith('.html')) {
            const minified = htmlmin.minify(content, {
                useShortDoctype: true,
                removeComments: true,
                collapseWhitespace: true,
            })
            return minified
        }

        return content
    })

    // Get true filename and path for js files transformed with Webpack
    eleventyConfig.addFilter('assetPath', function (value) {
        const manifestPath = path.resolve(
            __dirname,
            'src/_includes/assets/manifest.json'
        )
        const manifest = JSON.parse(fs.readFileSync(manifestPath))

        return manifest[value]
    })

    // Copy fonts and favicons
    eleventyConfig.addPassthroughCopy({
        'src/assets/fonts/FiraSans-Medium.woff2':
            '/fonts/FiraSans-Medium.woff2',
    })
    eleventyConfig.addPassthroughCopy({
        'src/assets/fonts/FiraSans-Regular.woff2':
            '/fonts/FiraSans-Regular.woff2',
    })
    eleventyConfig.addPassthroughCopy({
        'src/assets/fonts/FiraSans-SemiBold.woff2':
            '/fonts/FiraSans-SemiBold.woff2',
    })
    eleventyConfig.addPassthroughCopy({ 'src/assets/favicon': '/' })

    // Override Browsersync defaults (used only with --serve)
    eleventyConfig.setBrowserSyncConfig({
        callbacks: {
            ready: (err, browserSync) => {
                const content_404 = fs.readFileSync('_site/404.html')

                browserSync.addMiddleware('*', (req, res) => {
                    // Provides the 404 content without redirect.
                    res.writeHead(404, {
                        'Content-Type': 'text/html; charset=UTF-8',
                    })
                    res.write(content_404)
                    res.end()
                })
            },
        },
        files: './_site/css/**/*.css',
        ghostMode: false,
        ui: false,
    })

    // ./src/_includes/assets is in .gitignore, so tell Eleventy not
    // to listen to .gitignore when watching for changed files. That
    // way our js files will hot update in development.
    eleventyConfig.setUseGitIgnore(false)

    return {
        templateFormats: ['md', 'njk', 'html'],
        markdownTemplateEngine: 'liquid',
        htmlTemplateEngine: 'njk',
        dir: {
            input: 'src',
            output: '_site',
        },
    }
}
