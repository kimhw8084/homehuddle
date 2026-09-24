module.exports = function (api) {
  const isTest = api.env("test");
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    ],
    plugins: [
      ...(isTest ? ["@babel/plugin-transform-dynamic-import"] : []),
      "react-native-worklets/plugin",
    ],
  };
};
