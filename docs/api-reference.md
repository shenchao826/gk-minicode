# 岗策工具箱 - API 接口文档

## 公共参数

所有接口基础路径：`https://gk.minicode.cloud/api`

### 响应格式
```json
{
  "code": 0,
  "msg": "成功",
  "data": {}
}
```

| code | 说明 |
|------|------|
| 0 | 成功 |
| -1 | 失败 |

---

## 1. 获取商品列表

**GET** `/api/goods`

### 响应示例
```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "title": "国考岗位筛选Excel工具表",
      "price": 1.99,
      "description": "原创整理岗位筛选工具表格",
      "sort": 10
    }
  ]
}
```

---

## 2. 创建订单

**POST** `/api/createorder`

### 请求体
```json
{
  "goodsId": 1
}
```

### 响应示例
```json
{
  "code": 0,
  "data": {
    "payUrl": "https://api.hupijiao.com/pay?xxx",
    "tradeNo": "GK1234567890123"
  }
}
```

---

## 3. 查询订单

**GET** `/api/order/{tid}`

### 路径参数
| 参数 | 类型 | 说明 |
|------|------|------|
| tid | string | 订单编号 |

### 响应示例
```json
{
  "code": 0,
  "data": {
    "trade_id": "GK1234567890123",
    "goods_id": 1,
    "pay_amount": 1.99,
    "status": 1,
    "pan_link": "https://pan.baidu.com/s/xxx",
    "pan_code": "abcd"
  }
}
```

| status | 说明 |
|--------|------|
| 0 | 待支付 |
| 1 | 已支付 |

---

## 4. 支付回调

**POST** `/api/callback`

> 虎皮椒支付成功后自动调用，无需手动调用

---

## 后台管理接口（需鉴权）

所有后台接口需在请求头携带：
```
Authorization: Bearer 你的ADMIN_PASSWORD
```

---

## 5. 后台首页（商品+订单）

**GET** `/api/admin`

### 响应示例
```json
{
  "code": 0,
  "goods": [...],
  "orders": [...]
}
```

---

## 6. 新增商品

**POST** `/api/admin`

### 请求体
```json
{
  "title": "商品标题",
  "price": 1.99,
  "desc": "商品描述",
  "sort": 10
}
```

---

## 7. 修改商品

**PUT** `/api/admin/goods`

### 请求体
```json
{
  "id": 1,
  "title": "新标题",
  "price": 9.9,
  "desc": "新描述",
  "sort": 5
}
```

---

## 8. 删除商品

**DELETE** `/api/admin/goods`

### 请求体
```json
{
  "id": 1
}
```

---

## 9. 批量导入卡密

**POST** `/api/admin/card`

### 请求体
```json
{
  "goodsId": 1,
  "text": "https://pan.baidu.com/s/xxx|abcd\nhttps://pan.baidu.com/s/yyy|1234"
}
```

### 格式说明
- 一行一条卡密
- 链接和提取码用 `|` 分隔

---

## 10. 查询卡密库存

**GET** `/api/admin/cards?goodsId=1&used=0`

### 查询参数
| 参数 | 类型 | 说明 |
|------|------|------|
| goodsId | int | 商品ID（必填） |
| used | int | 0=未使用，1=已使用（可选） |

### 响应示例
```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "goods_id": 1,
      "pan_link": "https://pan.baidu.com/s/xxx",
      "pan_code": "abcd",
      "is_used": 0,
      "create_at": "2024-01-01 12:00:00"
    }
  ]
}
```