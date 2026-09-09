export const assetCategoryLabels: Record<string, string> = {
  All: '全部',
  Character: '人物',
  Scene: '场景',
  Item: '物品',
  Style: '风格',
  'Sound Effect': '音效',
  Others: '其他'
};

export const getAssetCategoryLabel = (category: string) => assetCategoryLabels[category] || category;

export const localizeLegacyContent = (value: string) => value
  .replaceAll('广告 Brief ', '广告需求')
  .replaceAll('广告 Brief', '广告需求')
  .replaceAll('image task completed in Demo simulation mode', '图片生成任务已在 Demo 模拟模式下完成')
  .replaceAll('video task completed in Demo simulation mode', '视频生成任务已在 Demo 模拟模式下完成')
  .replaceAll('text task completed in Demo simulation mode', '文本生成任务已在 Demo 模拟模式下完成');
