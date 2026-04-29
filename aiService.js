const axios = require('axios');
require('dotenv').config();

// 默认菜品列表（用于没有AI API时的备用方案）
const defaultFoods = [
  '红烧肉', '宫保鸡丁', '糖醋排骨', '鱼香肉丝', '麻婆豆腐',
  '水煮鱼', '清蒸鲈鱼', '糖醋里脊', '宫保虾球', '蒜蓉西兰花',
  '番茄炒蛋', '酸辣土豆丝', '地三鲜', '手撕包菜', '蒜蓉虾',
  '酸菜鱼', '水煮肉片', '回锅肉', '辣子鸡', '孜然牛肉'
];

// AI服务
const aiService = {
  // 生成菜品推荐
  generateRecommendations: async (topLikedFoods = []) => {
    try {
      const aiApiUrl = process.env.AI_API_URL;
      const aiApiKey = process.env.AI_API_KEY;
      
      // 如果没有配置AI API，使用默认推荐
      if (!aiApiUrl || !aiApiKey) {
        return aiService.getDefaultRecommendations(topLikedFoods);
      }
      
      // 构建提示词
      let prompt = '请推荐5道适合今天吃的菜品，以JSON数组格式返回，每个菜品包含name（菜名）和description（简短描述）两个字段。';
      
      // 如果有历史点赞数据，加入到提示词中
      if (topLikedFoods.length > 0) {
        const likedFoods = topLikedFoods.map(f => `${f.food_name}（点赞数：${f.like_count}）`).join('、');
        prompt += `\n根据用户历史点赞数据，用户喜欢的菜品有：${likedFoods}。请根据这些偏好进行推荐。`;
      }
      
      prompt += '\n请严格按照以下JSON格式返回：\n[{"name":"菜名1","description":"描述1"},{"name":"菜名2","description":"描述2"},{"name":"菜名3","description":"描述3"},{"name":"菜名4","description":"描述4"},{"name":"菜名5","description":"描述5"}]';
      
      // 调用AI API
      const response = await axios.post(
        aiApiUrl,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: '你是一个美食推荐专家，擅长根据用户喜好推荐合适的菜品。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiApiKey}`
          },
          timeout: 10000
        }
      );
      
      // 解析AI返回的结果
      const aiResponse = response.data.choices[0].message.content;
      
      // 尝试解析JSON
      try {
        // 提取JSON部分
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const recommendations = JSON.parse(jsonMatch[0]);
          // 验证格式
          if (Array.isArray(recommendations) && recommendations.length > 0) {
            return recommendations.map(item => ({
              name: item.name || item.food_name || item,
              description: item.description || ''
            }));
          }
        }
      } catch (parseError) {
        console.error('解析AI返回结果失败:', parseError);
      }
      
      // 如果解析失败，使用默认推荐
      return aiService.getDefaultRecommendations(topLikedFoods);
      
    } catch (error) {
      console.error('调用AI API失败:', error.message);
      // 出错时使用默认推荐
      return aiService.getDefaultRecommendations(topLikedFoods);
    }
  },
  
  // 获取默认推荐
  getDefaultRecommendations: (topLikedFoods = []) => {
    let selectedFoods = [];
    
    // 如果有历史点赞数据，优先从高点赞菜品中选择
    if (topLikedFoods.length > 0) {
      // 从高点赞菜品中随机选择3个
      const likedNames = topLikedFoods.map(f => f.food_name);
      const shuffledLiked = [...likedNames].sort(() => Math.random() - 0.5);
      selectedFoods = shuffledLiked.slice(0, Math.min(3, shuffledLiked.length));
    }
    
    // 从默认列表中补充剩余的
    const remaining = 5 - selectedFoods.length;
    const availableFoods = defaultFoods.filter(f => !selectedFoods.includes(f));
    const shuffledAvailable = [...availableFoods].sort(() => Math.random() - 0.5);
    const additionalFoods = shuffledAvailable.slice(0, remaining);
    
    const allFoods = [...selectedFoods, ...additionalFoods];
    
    // 随机打乱顺序
    const shuffled = allFoods.sort(() => Math.random() - 0.5);
    
    // 生成推荐对象
    return shuffled.map(name => ({
      name,
      description: `美味可口的${name}，是您今天的不错选择！`
    }));
  },
  
  // 根据点赞数据生成推荐语
  generateRecommendationText: async (topLikedFoods = []) => {
    // 严格按照要求输出格式
    return '根据用户口味今天我推荐吃这个';
  }
};

module.exports = aiService;
