<?php
// ══════════════════════════════════════════
// list-portfolio.php
// Escanea las carpetas de assets/image/portafolio/
// y devuelve SOLO las fotos que existen de verdad.
// Así nunca hay que tocar código para agregar/quitar fotos —
// solo subir o borrar archivos en la carpeta correcta.
// ══════════════════════════════════════════

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: https://guillermoworks.com');

// Categorías en el orden que quieres que aparezcan los filtros
$categorias = ['retrato', 'pareja', 'corporativo', 'lifestyle', 'urbana'];

// Extensiones de imagen válidas (minúsculas, se compara sin importar mayúsculas)
$extensiones_validas = ['jpg', 'jpeg', 'png', 'webp'];

$base = __DIR__ . '/image/portafolio';
$resultado = [];

foreach ($categorias as $cat) {
    $carpeta = "$base/$cat";
    if (!is_dir($carpeta)) continue;

    $archivos = scandir($carpeta);
    natsort($archivos); // orden natural: foto2 antes que foto10

    foreach ($archivos as $archivo) {
        if ($archivo === '.' || $archivo === '..') continue;

        $ext = strtolower(pathinfo($archivo, PATHINFO_EXTENSION));
        if (!in_array($ext, $extensiones_validas)) continue;

        $resultado[] = [
            'cat' => $cat,
            'src' => "image/portafolio/$cat/$archivo"
        ];
    }
}

echo json_encode($resultado);
?>
