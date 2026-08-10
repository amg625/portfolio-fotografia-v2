<?php
// CUESTIONARIO PRE-SESION DISCOVERY
// ══════════════════════════════════════════
// SEGURIDAD
// ══════════════════════════════════════════
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(403); die('Acceso denegado'); }

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== 'https://guillermoworks.com') {
    http_response_code(403);
    die('Origen no permitido');
}

session_start();
$key = 'rate_cuest_' . md5($_SERVER['REMOTE_ADDR']);
$_SESSION[$key] = ($_SESSION[$key] ?? 0) + 1;
if ($_SESSION[$key] > 5) {
    http_response_code(429);
    die(json_encode(['error' => 'Demasiados intentos']));
}


// ══════════════════════════════════════════
// HEADERS
// ══════════════════════════════════════════
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://guillermoworks.com');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// ══════════════════════════════════════════
// ENV
// ══════════════════════════════════════════
$env = parse_ini_file(__DIR__ . '/.env');
$db_host = $env['DB_HOST'];
$db_name = $env['DB_NAME'];
$db_user = $env['DB_USER'];
$db_pass = $env['DB_PASS'];
$to      = $env['MAIL_TO'];

// ══════════════════════════════════════════
// LEER DATOS
// ══════════════════════════════════════════
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) { http_response_code(400); die(json_encode(['error' => 'Datos invalidos'])); }

if (!empty($input['website'])) { http_response_code(200); die(json_encode(['success' => true])); }

function s($v) { return htmlspecialchars(strip_tags($v ?? '')); }

$nombre        = s($input['nombre']);
$apellido      = s($input['apellido']);
$correo        = filter_var($input['correo'] ?? '', FILTER_SANITIZE_EMAIL);
$telefono      = s($input['telefono']);
$tipo_sesion   = s($input['tipoSesion']);
$motivo        = s($input['motivo']);
$fecha_sesion  = s($input['fecha']);
$hora          = s($input['hora']);
$num_personas  = s($input['numPersonas']);
$outfits       = s($input['outfits']);
$colores       = s($input['colores']);
$no_colores    = s($input['noColores']);
$poses         = intval($input['poses'] ?? 0);
$referencias   = s($input['referencias']);
$feeling       = s($input['feeling']);
$uso_fotos     = s($input['usoFotos']);
$inseguridades = s($input['inseguridades']);
$extras        = s($input['extras']);
$como_llego    = s($input['comoLlego']);

if (!$nombre || !filter_var($correo, FILTER_VALIDATE_EMAIL) || !$fecha_sesion) {
    http_response_code(422);
    die(json_encode(['error' => 'Faltan campos requeridos']));
}

// ══════════════════════════════════════════
// BASE DE DATOS
// ══════════════════════════════════════════
try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $pdo->exec("CREATE TABLE IF NOT EXISTS cuestionarios (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        nombre        VARCHAR(150),
        apellido      VARCHAR(100),
        correo        VARCHAR(150) NOT NULL,
        telefono      VARCHAR(20),
        tipo_sesion   VARCHAR(100),
        motivo        TEXT,
        fecha_sesion  DATE,
        hora          VARCHAR(50),
        num_personas  VARCHAR(20),
        outfits       VARCHAR(50),
        colores       VARCHAR(200),
        no_colores    VARCHAR(200),
        poses         TINYINT,
        referencias   TEXT,
        feeling       VARCHAR(200),
        uso_fotos     VARCHAR(200),
        inseguridades TEXT,
        extras        TEXT,
        como_llego    VARCHAR(80),
        fecha_envio   DATETIME DEFAULT CURRENT_TIMESTAMP,
        revisado      TINYINT(1) DEFAULT 0
    )");

    $stmt = $pdo->prepare("INSERT INTO cuestionarios
        (nombre, apellido, correo, telefono, tipo_sesion, motivo, fecha_sesion, hora,
         num_personas, outfits, colores, no_colores, poses, referencias, feeling,
         uso_fotos, inseguridades, extras, como_llego)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");

    $stmt->execute([
        $nombre, $apellido, $correo, $telefono, $tipo_sesion, $motivo,
        $fecha_sesion, $hora, $num_personas, $outfits, $colores, $no_colores,
        $poses, $referencias, $feeling, $uso_fotos, $inseguridades, $extras, $como_llego
    ]);

} catch (PDOException $e) {
    error_log('DB Error cuestionario: ' . $e->getMessage());
}

// ══════════════════════════════════════════
// EMAIL
// ══════════════════════════════════════════
$nombre_completo = trim("$nombre $apellido");

// Sin emojis, sin acentos, sin caracteres especiales en subject
$subject = "Nuevo cuestionario - $nombre_completo - $fecha_sesion";

$body = "Nuevo cuestionario recibido desde guillermoworks.com/cuestionario.html\r\n\r\n"
      . "DATOS DEL CLIENTE\r\n"
      . "Nombre:    $nombre_completo\r\n"
      . "Correo:    $correo\r\n"
      . "WhatsApp:  $telefono\r\n\r\n"
      . "LA SESION\r\n"
      . "Tipo:      $tipo_sesion\r\n"
      . "Fecha:     $fecha_sesion\r\n"
      . "Hora:      $hora\r\n"
      . "Personas:  $num_personas\r\n"
      . "Para que:  $motivo\r\n\r\n"
      . "EL LOOK\r\n"
      . "Outfits:   $outfits\r\n"
      . "Colores:   $colores\r\n"
      . "No quiere: $no_colores\r\n"
      . "Poses 1-5: $poses\r\n\r\n"
      . "REFERENCIAS\r\n"
      . "Feeling:   $feeling\r\n"
      . "Uso fotos: $uso_fotos\r\n"
      . "Refs:      $referencias\r\n\r\n"
      . "EXTRAS\r\n"
      . "Inseguridades: $inseguridades\r\n"
      . "Notas:         $extras\r\n"
      . "Como llego:    $como_llego\r\n";

      /*
$headers = "From: noreply@guillermoworks.com\r\n"
         . "Reply-To: $correo\r\n"
         . "Content-Type: text/plain; charset=UTF-8\r\n"
         . "X-Mailer: PHP/" . phpversion();
         */
$headers = "From: noreply@guillermoworks.com\r\nContent-Type: text/plain; charset=UTF-8";

mail($to, $subject, $body, $headers);

// ══════════════════════════════════════════
// RESPUESTA
// ══════════════════════════════════════════
http_response_code(200);
echo json_encode(['success' => true]);
?>