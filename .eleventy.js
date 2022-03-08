const { DateTime } = require('luxon')
const fs = require('fs')
const pluginRss = require('@11ty/eleventy-plugin-rss')
const pluginNavigation = require('@11ty/eleventy-navigation')
const htmlmin = require('html-minifier')

module.exports = function (eleventyConfig) {
    // Add plugins
    eleventyConfig.addPlugin(pluginRss)
    eleventyConfig.addPlugin(pluginNavigation)

    // For debugging
    eleventyConfig.addFilter('log', value => {
        console.log(value)
    })

    // Test if a Nunjucks variable is an array
    eleventyConfig.addFilter('isArray', arr => Array.isArray(arr))

    // Various date formats
    const getYearMonth = post =>
        DateTime.fromJSDate(post, { zone: 'utc' }).toFormat('yyyy-LL')

    eleventyConfig.addFilter('yearAndMonth', getYearMonth)

    eleventyConfig.addFilter('yearOnly', dateObj => {
        return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat('yyyy')
    })

    eleventyConfig.addFilter('dayOnly', dateObj => {
        return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat('dd')
    })

    eleventyConfig.addFilter('readableDate', dateObj => {
        return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat(
            'dd LLLL yyyy'
        )
    })

    // https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
    eleventyConfig.addFilter('htmlDateString', dateObj => {
        return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat(
            'yyyy-LL-dd'
        )
    })

    // For tag lists on post pages, possibly up for removal
    eleventyConfig.addFilter('filterTagList', tags => {
        return (tags || []).filter(
            tag => ['all', 'nav', 'post', 'posts'].indexOf(tag) === -1
        )
    })

    // Break up posts by month and year for frontend styling
    eleventyConfig.addCollection('postsByMonth', collection => {
        const posts = collection.getFilteredByTag('posts').reverse()
        const months = posts.map(post => getYearMonth(post.date))
        const uniqueMonths = [...new Set(months)]

        const postsByMonth = uniqueMonths.reduce((prev, month) => {
            const filteredPosts = posts.filter(
                post =>
                    getYearMonth(post.date) === month &&
                    !post.data.tags.includes('In Progress')
            )

            return [...prev, filteredPosts]
        }, [])

        return postsByMonth
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

    return {
        templateFormats: ['md', 'njk', 'html', 'liquid'],
        markdownTemplateEngine: 'liquid',
        htmlTemplateEngine: 'njk',
        dir: {
            input: 'src',
            output: '_site',
        },
    }
}
