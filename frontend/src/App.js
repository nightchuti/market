import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./layouts/Layout";
import Home from "./pages/Home";
import AllProducts from "./pages/AllProducts";
import ProductDetail from "./pages/ProductDetail";
import AddProduct from "./pages/MyShop/AddProduct";
import ChatPage from "./pages/ChatPage";
import MyShop from "./pages/MyShop/MyShop";
import ChatFloating from "./pages/ChatFloating";
import Cart from "./pages/Cart";
import ProfilePage from "./pages/ProfilePage/ProfilePage";
import EditProduct from "./pages/MyShop/EditProduct";
import PremiumMember from "./pages/PreMember/PremiumMember";

function App() {
  return (
    <BrowserRouter>
      <ChatFloating />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<AllProducts />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/add-product" element={<AddProduct />} />
          <Route path="/chat/:roomId" element={<ChatPage />} />
          <Route path="/my-shop" element={<MyShop />} />
          <Route path="/chat-floating" element={<ChatFloating />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/edit-product/:id" element={<EditProduct />} />
          <Route path="/premium" element={<PremiumMember />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
