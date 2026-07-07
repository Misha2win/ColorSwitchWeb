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

export function hexToHsl(hex) {
    const num = parseInt(hex.slice(1), 16)

    const r = ((num >> 16) & 255) / 255
    const g = ((num >> 8) & 255) / 255
    const b = (num & 255) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const d = max - min

    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (d !== 0) {
        s = l > 0.5
            ? d / (2 - max - min)
            : d / (max + min)

        if (max === r) {
            h = (g - b) / d + (g < b ? 6 : 0)
        } else if (max === g) {
            h = (b - r) / d + 2
        } else {
            h = (r - g) / d + 4
        }

        h /= 6
    }

    return { h, s, l }
}

export function hslToHex(h, s, l) {
    const hueToRgb = (p, q, t) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
    }

    let r
    let g
    let b

    if (s === 0) {
        r = l
        g = l
        b = l
    } else {
        const q = l < 0.5
            ? l * (1 + s)
            : l + s - l * s

        const p = 2 * l - q

        r = hueToRgb(p, q, h + 1 / 3)
        g = hueToRgb(p, q, h)
        b = hueToRgb(p, q, h - 1 / 3)
    }

    const toHex = value => {
        return Math.round(value * 255).toString(16).padStart(2, '0')
    }

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function desaturateHex(hex, amount = 0.5) {
    amount = Math.max(0, Math.min(1, amount))

    const hsl = hexToHsl(hex)

    hsl.s *= 1 - amount

    return hslToHex(hsl.h, hsl.s, hsl.l)
}