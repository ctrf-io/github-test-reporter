import Handlebars from 'handlebars'

/**
 * Iterates over a subsection (slice) of an array and renders a block for each item.
 *
 * This helper takes an array, a start index, and an end index, then slices the array
 * and renders the given block with each item in that sliced section. Useful for
 * pagination or limiting displayed items.
 *
 * @example
 * // In Handlebars:
 * // {{#slice items 0 3}}
 * //   <li>{{this}}</li>
 * // {{/slice}}
 * //
 * // Renders the first three items of the array as list items.
 *
 * @param {any[]} array - The array to be sliced.
 * @param {number} start - The start index for the slice.
 * @param {number} end - The end index for the slice.
 * @param {Handlebars.HelperOptions} options - Handlebars options object, including the block to render.
 * @returns {string} A concatenated string of all rendered items within the slice.
 */
export function sliceArrayHelper(): void {
  Handlebars.registerHelper(
    'slice',
    (
      array: unknown[],
      start: number,
      end: number,
      options: Handlebars.HelperOptions
    ) => {
      const slicedArray = array.slice(start, end)
      return slicedArray.map((item: unknown) => options.fn(item)).join('')
    }
  )
}
