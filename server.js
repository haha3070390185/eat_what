const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const database = require('./database');
const aiService = require('./aiService');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API 路由

// 获取菜品推荐（集成AI和点赞数据分析）
app.get('/api/recommendations', async (req, res) => {
  try {
    console.log('收到推荐请求...');
    
    // 获取点赞最多的前10个菜品（按点赞数从高到低排序）
    const topLikedFoods = await database.getTopLikedFoods(10);
    
    console.log('历史点赞数据:', topLikedFoods.length > 0 ? topLikedFoods.map(f => `${f.food_name}: ${f.like_count}赞`).join(', ') : '暂无点赞数据');
    
    // 分析用户口味偏好
    const preferences = aiService.analyzeUserPreferences(topLikedFoods);
    console.log('用户口味偏好分析:', preferences);
    
    // 生成推荐（调用DeepSeek AI API）
    console.log('开始生成AI推荐...');
    const recommendations = await aiService.generateRecommendations(topLikedFoods);
    
    console.log(`成功生成 ${recommendations.length} 个推荐`);
    
    // 生成推荐语（严格按照要求格式）
    const recommendationText = await aiService.generateRecommendationText(topLikedFoods);
    
    res.json({
      success: true,
      recommendationText,
      recommendations,
      preferences: preferences,
      hasHistoryData: topLikedFoods.length > 0,
      topLikedFoods: topLikedFoods.slice(0, 5) // 返回前5个点赞最多的菜品
    });
  } catch (error) {
    console.error('获取推荐失败:', error);
    res.status(500).json({
      success: false,
      message: '获取推荐失败，请稍后重试',
      error: error.message
    });
  }
});

// 点赞接口
app.post('/api/like', async (req, res) => {
  try {
    const { foodName } = req.body;
    
    if (!foodName || typeof foodName !== 'string' || foodName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '菜名不能为空'
      });
    }
    
    const trimmedFoodName = foodName.trim();
    console.log(`用户为「${trimmedFoodName}」点赞`);
    
    // 增加点赞
    const result = await database.addLike(trimmedFoodName);
    
    const likeCount = result.like_count || result.likeCount;
    console.log(`「${trimmedFoodName}」当前点赞数: ${likeCount}`);
    
    res.json({
      success: true,
      data: {
        foodName: result.food_name || result.foodName,
        likeCount: likeCount
      },
      message: `已为「${trimmedFoodName}」点赞，当前共${likeCount}个赞`
    });
  } catch (error) {
    console.error('点赞失败:', error);
    res.status(500).json({
      success: false,
      message: '点赞失败，请稍后重试',
      error: error.message
    });
  }
});

// 获取所有点赞数据
app.get('/api/likes', async (req, res) => {
  try {
    const allLikes = await database.getAllFoodLikes();
    
    res.json({
      success: true,
      data: allLikes,
      count: allLikes.length
    });
  } catch (error) {
    console.error('获取点赞数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取点赞数据失败',
      error: error.message
    });
  }
});

// 获取用户口味偏好分析
app.get('/api/preferences', async (req, res) => {
  try {
    const topLikedFoods = await database.getTopLikedFoods(10);
    const preferences = aiService.analyzeUserPreferences(topLikedFoods);
    
    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('获取用户偏好失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户偏好失败',
      error: error.message
    });
  }
});

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '服务运行正常',
    timestamp: new Date().toISOString(),
    aiConfigured: !!(process.env.AI_API_URL && process.env.AI_API_KEY)
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('========================================');
  console.log('  🍽️ 今天吃啥 - 美食推荐系统');
  console.log('========================================');
  console.log(`服务地址: http://localhost:${PORT}`);
  console.log(`API文档: http://localhost:${PORT}/api/health`);
  console.log('========================================');
  
  // 检查AI配置
  const aiConfigured = !!(process.env.AI_API_URL && process.env.AI_API_KEY);
  if (aiConfigured) {
    console.log('✅ AI API 已配置 (DeepSeek)');
    console.log(`   API URL: ${process.env.AI_API_URL}`);
  } else {
    console.log('⚠️  AI API 未配置，将使用默认推荐');
    console.log('   请在 .env 文件中配置 AI_API_URL 和 AI_API_KEY');
  }
  console.log('========================================');
});
