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
        console.log('未配置AI API，使用默认推荐');
        return aiService.getDefaultRecommendations(topLikedFoods);
      }
      
      console.log('调用DeepSeek AI API进行推荐...');
      
      // 构建系统提示词
      const systemPrompt = `你是一位专业的美食推荐专家，精通中国八大菜系和各种地方特色美食。你的任务是根据用户的历史点赞数据，为用户推荐最适合今天吃的菜品。

## 工作原则：
1. **优先推荐高点赞菜品**：用户点赞数越高的菜品，说明用户越喜欢，必须在推荐中优先考虑
2. **多样化推荐**：推荐的菜品应该涵盖不同的口味（辣、甜、酸、咸等）和烹饪方式（炒、蒸、煮、炖等）
3. **考虑实际场景**：推荐的菜品应该是适合日常食用的家常菜，不要推荐过于复杂或罕见的菜品
4. **给出推荐理由**：每个推荐都必须说明为什么推荐这道菜，要结合用户的点赞数据

## 输出要求：
你必须严格按照以下JSON格式返回，不要有任何额外的文字说明：

{
  "recommendations": [
    {
      "name": "菜品名称",
      "description": "简短的菜品描述",
      "reason": "推荐这道菜的原因，要结合用户的点赞数据分析"
    }
  ]
}

注意：
- 必须推荐恰好5道菜品
- reason字段必须详细，要体现出对用户点赞数据的分析
- 所有字段都必须用中文
- 不要返回任何markdown格式，只返回纯JSON`;

      // 构建用户提示词
      let userPrompt = `请为我推荐今天吃什么。

## 我的历史点赞数据（按点赞数从高到低排序）：
`;
      
      // 如果有历史点赞数据，加入到提示词中
      if (topLikedFoods.length > 0) {
        userPrompt += '\n';
        topLikedFoods.forEach((food, index) => {
          userPrompt += `${index + 1}. ${food.food_name} - 点赞数：${food.like_count}\n`;
        });
        
        userPrompt += `\n## 分析要求：
- 点赞数越高的菜品，说明我越喜欢，请优先推荐类似口味和类型的菜品
- 如果点赞数高的菜品主要是辣味，说明我喜欢吃辣
- 如果点赞数高的菜品主要是清淡口味，说明我喜欢吃清淡的菜
- 请结合我的点赞数据，给出个性化的推荐和详细的推荐理由`;
      } else {
        userPrompt += `\n我还没有点赞过任何菜品，请随机推荐5道美味的家常菜，并给出推荐理由。`;
      }
      
      userPrompt += `\n\n请严格按照JSON格式返回推荐结果。`;
      
      console.log('发送请求到DeepSeek API...');
      
      // 调用DeepSeek API
      const response = await axios.post(
        aiApiUrl,
        {
          model: 'deepseek-chat', // 使用DeepSeek的模型
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.8,
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiApiKey}`
          },
          timeout: 30000
        }
      );
      
      console.log('DeepSeek API响应成功');
      
      // 解析AI返回的结果
      const aiResponse = response.data.choices[0].message.content;
      console.log('AI响应内容:', aiResponse);
      
      // 尝试解析JSON
      try {
        const parsedResponse = JSON.parse(aiResponse);
        
        // 验证格式
        if (parsedResponse.recommendations && Array.isArray(parsedResponse.recommendations)) {
          console.log(`成功解析到 ${parsedResponse.recommendations.length} 个推荐`);
          
          // 确保每个推荐都有必要的字段
          return parsedResponse.recommendations.map(item => ({
            name: item.name || '未知菜品',
            description: item.description || '美味的家常菜',
            reason: item.reason || '这是一道美味的菜品'
          }));
        }
      } catch (parseError) {
        console.error('解析AI返回结果失败:', parseError);
        console.error('原始响应:', aiResponse);
        
        // 尝试提取JSON部分
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsedResponse = JSON.parse(jsonMatch[0]);
            if (parsedResponse.recommendations && Array.isArray(parsedResponse.recommendations)) {
              return parsedResponse.recommendations.map(item => ({
                name: item.name || '未知菜品',
                description: item.description || '美味的家常菜',
                reason: item.reason || '这是一道美味的菜品'
              }));
            }
          }
        } catch (e) {
          console.error('二次解析也失败了:', e);
        }
      }
      
      // 如果解析失败，使用默认推荐
      console.log('解析失败，使用默认推荐');
      return aiService.getDefaultRecommendations(topLikedFoods);
      
    } catch (error) {
      console.error('调用DeepSeek API失败:', error.message);
      if (error.response) {
        console.error('API响应状态:', error.response.status);
        console.error('API响应数据:', error.response.data);
      }
      // 出错时使用默认推荐
      return aiService.getDefaultRecommendations(topLikedFoods);
    }
  },
  
  // 获取默认推荐（当AI API不可用时使用）
  getDefaultRecommendations: (topLikedFoods = []) => {
    let selectedFoods = [];
    const recommendations = [];
    
    // 如果有历史点赞数据，优先从高点赞菜品中选择
    if (topLikedFoods.length > 0) {
      // 从高点赞菜品中选择（最多3个）
      const likedNames = topLikedFoods.map(f => f.food_name);
      for (let i = 0; i < Math.min(3, likedNames.length); i++) {
        const foodName = likedNames[i];
        const likeCount = topLikedFoods[i].like_count;
        selectedFoods.push(foodName);
        recommendations.push({
          name: foodName,
          description: `这是您之前点赞过的菜品，共获得${likeCount}个赞`,
          reason: `根据您的历史点赞数据，您非常喜欢${foodName}，这道菜获得了${likeCount}个赞，是您的最爱之一。推荐您今天再尝一尝！`
        });
      }
    }
    
    // 从默认列表中补充剩余的
    const remaining = 5 - selectedFoods.length;
    if (remaining > 0) {
      const availableFoods = defaultFoods.filter(f => !selectedFoods.includes(f));
      const shuffledAvailable = [...availableFoods].sort(() => Math.random() - 0.5);
      const additionalFoods = shuffledAvailable.slice(0, remaining);
      
      additionalFoods.forEach(foodName => {
        selectedFoods.push(foodName);
        
        let reason = '';
        if (topLikedFoods.length > 0) {
          reason = `根据您的历史点赞偏好，为您推荐${foodName}。这是一道经典的家常菜，口味丰富，非常适合今天食用。`;
        } else {
          reason = `${foodName}是一道非常受欢迎的家常菜，口味独特，营养丰富，是您今天的不错选择！`;
        }
        
        recommendations.push({
          name: foodName,
          description: `美味可口的${foodName}，经典家常菜`,
          reason: reason
        });
      });
    }
    
    // 随机打乱顺序
    return recommendations.sort(() => Math.random() - 0.5);
  },
  
  // 根据点赞数据生成推荐语
  generateRecommendationText: async (topLikedFoods = []) => {
    // 严格按照要求输出格式
    return '根据用户口味今天我推荐吃这个';
  },
  
  // 分析用户口味偏好
  analyzeUserPreferences: (topLikedFoods = []) => {
    if (topLikedFoods.length === 0) {
      return {
        hasData: false,
        message: '暂无点赞数据，无法分析口味偏好'
      };
    }
    
    // 简单的口味分析（可以扩展为更复杂的分析）
    const spicyFoods = ['水煮鱼', '麻婆豆腐', '水煮肉片', '回锅肉', '辣子鸡', '宫保鸡丁', '酸菜鱼'];
    const sweetFoods = ['糖醋排骨', '糖醋里脊', '红烧肉'];
    const lightFoods = ['清蒸鲈鱼', '蒜蓉西兰花', '番茄炒蛋', '手撕包菜', '蒜蓉虾'];
    
    let spicyCount = 0;
    let sweetCount = 0;
    let lightCount = 0;
    let totalLikes = 0;
    
    topLikedFoods.forEach(food => {
      totalLikes += food.like_count;
      
      if (spicyFoods.includes(food.food_name)) {
        spicyCount += food.like_count;
      } else if (sweetFoods.includes(food.food_name)) {
        sweetCount += food.like_count;
      } else if (lightFoods.includes(food.food_name)) {
        lightCount += food.like_count;
      }
    });
    
    let preference = '综合口味';
    let detail = '';
    
    if (spicyCount > sweetCount && spicyCount > lightCount) {
      preference = '辣味';
      detail = '您似乎非常喜欢吃辣的菜品，推荐可以尝试更多川菜和湘菜';
    } else if (sweetCount > spicyCount && sweetCount > lightCount) {
      preference = '甜味';
      detail = '您似乎更喜欢甜口的菜品，糖醋系列是您的最爱';
    } else if (lightCount > spicyCount && lightCount > sweetCount) {
      preference = '清淡';
      detail = '您似乎更偏好清淡健康的菜品，清蒸和蒜蓉系列很适合您';
    }
    
    return {
      hasData: true,
      totalLikes,
      preference,
      detail,
      topFoods: topLikedFoods.slice(0, 3).map(f => f.food_name)
    };
  }
};

module.exports = aiService;
