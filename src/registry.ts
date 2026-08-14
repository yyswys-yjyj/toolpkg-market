// @ts-nocheck
// ToolPkg 宿主入口：本文件为 manifest.main 提供 registerToolPkg 注册函数。
// 纯工具包无需注册 UI/XML/hook，仅作宿主加载的主脚本入口。
function registerToolPkg() {
  return true;
}

module.exports = {
  registerToolPkg: registerToolPkg
};
