/**
 * Takes a HEX color and lightens it with a lighten multiplier
 */
export function lightenHex(hex, amount = 0.3) { // ChatGPT helped with this
    const num = parseInt(hex.slice(1), 16)
    const r = (num >> 16) & 255
    const g = (num >> 8) & 255
    const b = num & 255
    const toHex = v => Math.round(v).toString(16).padStart(2, '0')
    const lr = r + (255 - r) * amount
    const lg = g + (255 - g) * amount
    const lb = b + (255 - b) * amount
    return `#${toHex(lr)}${toHex(lg)}${toHex(lb)}`
}

/**
 * Takes a HEX color and darkens it with a darken multiplier
 */
export function darkenHex(hex, amount = 0.3) {
    const num = parseInt(hex.slice(1), 16)
    const r = (num >> 16) & 255
    const g = (num >> 8) & 255
    const b = num & 255
    const toHex = v => Math.round(v).toString(16).padStart(2, '0')
    const multiplier = 1 - amount
    return `#${toHex(r * multiplier)}${toHex(g * multiplier)}${toHex(b * multiplier)}`
}
