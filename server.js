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

// 获取菜品推荐
app.get('/api/recommendations', async (req, res) => {
  try {
    // 获取点赞最多的前10个菜品
    const topLikedFoods = await database.getTopLikedFoods(10);
    
    // 生成推荐
    const recommendations = await aiService.generateRecommendations(topLikedFoods);
    
    // 生成推荐语
    const recommendationText = await aiService.generateRecommendationText(topLikedFoods);
    
    res.json({
      success: true,
      recommendationText,
      recommendations
    });
  } catch (error) {
    console.error('获取推荐失败:', error);
    res.status(500).json({
      success: false,
      message: '获取推荐失败，请稍后重试'
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
    
    // 增加点赞
    const result = await database.addLike(foodName.trim());
    
    res.json({
      success: true,
      data: {
        foodName: result.food_name || result.foodName,
        likeCount: result.like_count || result.likeCount
      }
    });
  } catch (error) {
    console.error('点赞失败:', error);
    res.status(500).json({
      success: false,
      message: '点赞失败，请稍后重试'
    });
  }
});

// 获取所有点赞数据
app.get('/api/likes', async (req, res) => {
  try {
    const allLikes = await database.getAllFoodLikes();
    
    res.json({
      success: true,
      data: allLikes
    });
  } catch (error) {
    console.error('获取点赞数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取点赞数据失败'
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`请在浏览器中打开 http://localhost:${PORT} 访问应用`);
});
