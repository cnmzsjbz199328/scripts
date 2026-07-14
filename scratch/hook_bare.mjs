// Arissa 侧视时斗篷(arissaCloak_Geo)贴边缘看起来像一根斜杖，隐藏掉才是干净的裸手剪影
export function onModelLoaded({ model }) {
  const cloak = model.getObjectByName('arissaCloak_Geo');
  if (cloak) cloak.visible = false;
}
