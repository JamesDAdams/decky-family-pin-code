// Mock Decky Loader internal API and Steam webpack environment for test environment
if (typeof window !== "undefined") {
  const mockWebpackRequire: any = () => ({});
  mockWebpackRequire.m = {};
  (window as any).webpackChunksteamui = {
    push: (arr: any[]) => {
      if (arr && typeof arr[2] === "function") {
        arr[2](mockWebpackRequire);
      }
    },
  };

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
