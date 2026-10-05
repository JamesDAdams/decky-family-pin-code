// Mock Decky Loader internal API for test environment
if (typeof window !== "undefined") {
  (window as any).__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit = {
    connect: () => ({
      _version: 2,
      call: async () => {},
      callable: () => async () => {},
      addEventListener: () => () => {},
      removeEventListener: () => {},
      toaster: {
        toast: () => ({ data: {}, dismiss: () => {} }),
      },
      executeInTab: async () => ({ success: true, result: null }),
      injectCssIntoTab: () => "",
      removeCssFromTab: () => {},
    }),
  };
}
