import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./layouts/Layout";
import Home from "./pages/Home";
import AllProducts from "./pages/AllProducts";
import ProductDetail from "./pages/ProductDetail";
import AddProduct from "./pages/AddProduct";
import ChatPage from "./pages/ChatPage";
<<<<<<< HEAD
import ChatFloating from "./pages/ChatFloating";
=======
import MyShop from "./pages/MyShop/MyShop";
>>>>>>> 8432e73e143bb2f8927126ebc0d768bd99948ad8

function App() {
  return (
    <BrowserRouter>
    <ChatFloating /> {/* แชทลอยตัวที่ทุกหน้าจะเห็น */}
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<AllProducts />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/add-product" element={<AddProduct />} />
          <Route path="/chat/:sellerId" element={<ChatPage />} />
<<<<<<< HEAD
          
=======
          <Route path="/my-shop" element={<MyShop />} />
>>>>>>> 8432e73e143bb2f8927126ebc0d768bd99948ad8
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
