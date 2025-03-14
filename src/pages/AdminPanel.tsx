
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, Search, Trash2 } from "lucide-react";
import { Product, extractCategories } from "@/utils/scraper";
import ProductDisplay from "@/components/ProductDisplay";
import ProductPagination from "@/components/ProductPagination";

const AdminPanel = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("todas");
  const [categories, setCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(10);
  
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  useEffect(() => {
    // Cargar datos del localStorage
    const savedProducts = localStorage.getItem("scraped_products");
    const savedTimestamp = localStorage.getItem("scraped_timestamp");
    const savedUrl = localStorage.getItem("scraped_url");

    if (savedProducts) {
      const parsedProducts = JSON.parse(savedProducts) as Product[];
      setProducts(parsedProducts);
      
      // Extraer categorías de los productos
      const extractedCategories = extractCategories(parsedProducts);
      setCategories(extractedCategories);
    }

    if (savedTimestamp) {
      setLastUpdated(savedTimestamp);
    }

    if (savedUrl) {
      setSourceUrl(savedUrl);
    }
  }, []);

  // Filtrar productos cuando cambien los criterios
  useEffect(() => {
    let filtered = [...products];
    
    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        product =>
          product.name.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query)
      );
    }
    
    // Filtrar por categoría
    if (selectedCategory !== "todas") {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    // Ordenar productos: primero los que tienen imagen, después los que no
    filtered.sort((a, b) => {
      const aHasImage = Boolean(a.imageUrl);
      const bHasImage = Boolean(b.imageUrl);
      
      if (aHasImage && !bHasImage) return -1;
      if (!aHasImage && bHasImage) return 1;
      return 0;
    });
    
    setFilteredProducts(filtered);
    setCurrentPage(1); // Resetear a la primera página
  }, [searchQuery, selectedCategory, products]);

  // Calcular productos de la página actual
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  // Manejar cambio de página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Exportar datos a CSV
  const exportToCsv = () => {
    if (products.length === 0) return;
    
    // Definir encabezados CSV
    const headers = [
      "ID", "Nombre", "Precio", "Categoría", "URL", "Descripción",
      "Precio Original", "Descuento", "SKU", "Estado stock", "Marca"
    ];
    
    // Preparar filas
    const rows = products.map(product => [
      product.id,
      product.name,
      product.price,
      product.category,
      product.url,
      product.description || "",
      product.originalPrice || "",
      product.discount || "",
      product.sku || "",
      product.stockStatus || "",
      product.brand || ""
    ]);
    
    // Unir encabezados y filas
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    // Crear archivo para descargar
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `productos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Limpiar todos los datos
  const clearAllData = () => {
    if (confirm("¿Estás seguro de que quieres eliminar todos los datos recopilados?")) {
      localStorage.removeItem("scraped_products");
      localStorage.removeItem("scraped_timestamp");
      localStorage.removeItem("scraped_url");
      localStorage.removeItem("store_info");
      localStorage.removeItem("contact_info");
      navigate("/");
    }
  };

  if (products.length === 0) {
    return (
      <div className="container max-w-5xl mx-auto py-10">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">No hay productos disponibles</h1>
          <p className="text-muted-foreground">
            No se han encontrado productos. Por favor, realiza un rastreo de sitio web primero.
          </p>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 mx-auto py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Productos Encontrados</h1>
          <p className="text-muted-foreground">
            {filteredProducts.length} productos encontrados
            {sourceUrl && (
              <span> en <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{sourceUrl}</a></span>
            )}
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Última actualización: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Nuevo rastreo
          </Button>
          
          <Button variant="outline" size="sm" onClick={exportToCsv}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          
          <Button variant="destructive" size="sm" onClick={clearAllData}>
            <Trash2 className="h-4 w-4 mr-2" />
            Limpiar datos
          </Button>
        </div>
      </div>
      
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-2/3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          </div>
          
          <div className="w-full md:w-1/6">
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-1/6">
            <Select
              value={productsPerPage.toString()}
              onValueChange={(val) => setProductsPerPage(parseInt(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Por página" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 por página</SelectItem>
                <SelectItem value="20">20 por página</SelectItem>
                <SelectItem value="50">50 por página</SelectItem>
                <SelectItem value="100">100 por página</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>
      
      <Tabs defaultValue="tarjetas" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-6">
          <TabsTrigger value="tabla">Vista de Tabla</TabsTrigger>
          <TabsTrigger value="tarjetas">Vista de Tarjetas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tabla" className="w-full">
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableCaption>Lista de productos encontrados</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Imagen</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentProducts.length > 0 ? (
                    currentProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-16 h-16 object-contain"
                              onError={(e) => (e.currentTarget.src = "https://placehold.co/100x100?text=No+Image")}
                            />
                          ) : (
                            <div className="w-16 h-16 bg-muted flex items-center justify-center text-xs text-center">
                              Sin imagen
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="truncate max-w-[200px]" title={product.name}>
                            {product.name}
                          </div>
                          {product.brand && (
                            <div className="text-xs text-muted-foreground">
                              {product.brand}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold">{product.price}</div>
                          {product.originalPrice && (
                            <div className="text-xs text-muted-foreground line-through">
                              {product.originalPrice}
                            </div>
                          )}
                          {product.discount && (
                            <Badge variant="destructive" className="text-xs mt-1">
                              {product.discount}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {product.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {product.sku || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={product.stockStatus?.toLowerCase().includes("stock") || !product.stockStatus 
                              ? "outline" 
                              : "secondary"}
                            className="text-xs"
                          >
                            {product.stockStatus || "Disponible"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No se encontraron productos con los filtros seleccionados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="tarjetas">
          <ProductDisplay products={currentProducts} />
        </TabsContent>
      </Tabs>
      
      {filteredProducts.length > productsPerPage && (
        <ProductPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={filteredProducts.length}
          itemsPerPage={productsPerPage}
        />
      )}
    </div>
  );
};

export default AdminPanel;
