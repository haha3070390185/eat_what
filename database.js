const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'eat_what.json');

// 初始化数据库文件
function initDatabase() {
  if (!fs.existsSync(dbPath)) {
    const initialData = {
      foodLikes: []
    };
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

// 读取数据库
function readDatabase() {
  initDatabase();
  const data = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(data);
}

// 写入数据库
function writeDatabase(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

// 数据库操作函数
const database = {
  // 获取所有菜品点赞数据
  getAllFoodLikes: () => {
    return new Promise((resolve) => {
      const data = readDatabase();
      // 按点赞数降序排序
      const sorted = [...data.foodLikes].sort((a, b) => b.like_count - a.like_count);
      resolve(sorted);
    });
  },
  
  // 获取点赞最多的前N个菜品
  getTopLikedFoods: (limit = 10) => {
    return new Promise((resolve) => {
      const data = readDatabase();
      // 按点赞数降序排序，取前limit个
      const sorted = [...data.foodLikes]
        .sort((a, b) => b.like_count - a.like_count)
        .slice(0, limit);
      resolve(sorted);
    });
  },
  
  // 增加点赞
  addLike: (foodName) => {
    return new Promise((resolve) => {
      const data = readDatabase();
      const now = new Date().toISOString();
      
      // 查找是否已有该菜品
      let foodIndex = data.foodLikes.findIndex(f => f.food_name === foodName);
      
      if (foodIndex >= 0) {
        // 已有，增加点赞数
        data.foodLikes[foodIndex].like_count += 1;
        data.foodLikes[foodIndex].updated_at = now;
      } else {
        // 没有，新增
        data.foodLikes.push({
          id: data.foodLikes.length + 1,
          food_name: foodName,
          like_count: 1,
          created_at: now,
          updated_at: now
        });
        foodIndex = data.foodLikes.length - 1;
      }
      
      // 写入数据库
      writeDatabase(data);
      
      // 返回更新后的数据
      resolve(data.foodLikes[foodIndex]);
    });
  },
  
  // 获取单个菜品的点赞数
  getFoodLikeCount: (foodName) => {
    return new Promise((resolve) => {
      const data = readDatabase();
      const food = data.foodLikes.find(f => f.food_name === foodName);
      resolve(food ? food.like_count : 0);
    });
  }
};

module.exports = database;
