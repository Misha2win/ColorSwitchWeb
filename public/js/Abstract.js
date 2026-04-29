export default function abstractError(methodName, className) {
   throw new Error(`${methodName} must be implemented in ${className}`)
}