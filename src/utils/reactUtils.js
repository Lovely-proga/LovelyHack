export default {
    getFiber(el) {
        for (const k in el) {
            if (k.startsWith("__reactFiber$")) return el[k];
        }
    },

    getDispatch (fiber) {
        while (fiber) {
            let memoizedState = fiber.memoizedState;
            while (memoizedState) {
                if (memoizedState.queue?.dispatch) {
                    return memoizedState.queue.dispatch;
                }
                memoizedState = memoizedState.next;
            }
            fiber = fiber.return;
        }
    }
}