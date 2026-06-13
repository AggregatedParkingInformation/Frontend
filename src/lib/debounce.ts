export function debounce<F extends (...args: never[]) => void>(fn: F, ms: number): F {
    let timer: ReturnType<typeof setTimeout>;
    return ((...args: Parameters<F>) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    }) as F;
}
