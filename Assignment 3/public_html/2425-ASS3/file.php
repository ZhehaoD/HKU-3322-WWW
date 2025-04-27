<?php
session_start();
$session_timeout = 300;
if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > $session_timeout) {
    session_unset();
    session_destroy();
    header('Location: index.php?message=Session expired!!');
    exit;
}

if (!isset($_SESSION['username'])) {
    http_response_code(401);
    echo "Unauthorized access";
    exit;
}

define("SYSUSER", 'admin');
define("SYSPASSWORD", '123456');
define("DB_HOST", "mydb");
define("USERNAME", "dummy");
define("PASSWORD", "c3322b");
define("DB_NAME", "db3322");

$conn = mysqli_connect(DB_HOST, USERNAME, PASSWORD, DB_NAME) or die("Connection Error!". mysqli_connect_error());

if (isset($_GET['action']) && $_GET['action'] == 'update_pcount' && isset($_GET['musid'])) {
    $musid = $_GET['musid'];
    $query = "UPDATE Music SET Pcount = Pcount + 1 WHERE _id = '$musid'";
    mysqli_query($conn, $query);
    exit;
}

start();
echo '<link rel="stylesheet" href="look.css">';



function start()
{
    if (isset($_POST['login'])) { //if is a POST request
        if (authenticate()) {
            // display secured content if user logged in successfully
            display_secured_content();
        } else {
            // display login form again with message
            display_login_form('Invalid username or password.');
        }
    } else {
        // is a GET request
        if (authenticate()) {
            display_secured_content();
        } else {
            // default: display the login form
            display_login_form();
        }
    }
    ?><script src="handle.js"></script><?php
}

function display_login_form($msg = '')
{
    global $conn;
    ?>
    <div id="login">
        <div id="head">
            <h1>3322 Royalty Free Music</h1>
            <p>(Source:<i><a href="https://www.chosic.com/free-music/all/.">https://www.chosic.com/free-music/all/</a></i>)</p>
        </div>
        <div id="form">
            <div id="loginHeader"><b>LOG IN</b></div>
            <form id="loginForm" action="index.php" method="post">
                <label for="username">Username:</label>
                <input type="text" id="username" name="username">
                <div class="error-tooltip" id="usernameError" hidden>Missing username!!</div>
                <label for="password">Password:</label>
                <input type="password" id="password" name="password">
                <div class="error-tooltip" id="passwordError" hidden>Password is missing!!</div>
                <button type="submit" id="Log in"><b>Log in</b></button>
            </form>
        </div>
        <?php
        if ($_SERVER["REQUEST_METHOD"] == "POST") {
            $username = $_POST["username"];
            $password = $_POST["password"];
            $checkUserQuery = "SELECT * FROM account WHERE username = '$username'";
            $userResult = mysqli_query($conn, $checkUserQuery);
            if (mysqli_num_rows($userResult) == 0) {
                echo '<div id="erroruser"><b>No such user!!</b></div>';
            } else {
                $checkPasswordQuery = "SELECT * FROM account WHERE username = '$username' AND password = '$password'";
                $passwordResult = mysqli_query($conn, $checkPasswordQuery);
                if (mysqli_num_rows($passwordResult) == 0) {
                    echo '<div id="errorpassword"><b>Incorrect password!!</b></div>';
                }
            }
        }
        ?>
    </div>
    <script>
        const loginForm = document.getElementById('loginForm');
        const usernameInput = document.getElementById('username');
        const usernameError = document.getElementById('usernameError');
        const passwordInput = document.getElementById('password');
        const passwordError = document.getElementById('passwordError');
        loginForm.addEventListener('submit', function (e) {
            const username = usernameInput.value;
            if (username === '') {
                e.preventDefault();
                usernameError.style.display = 'block';
                usernameInput.focus();
            } else {
                usernameError.hidden = false;
                const password = passwordInput.value;
                if (password === '') {
                    e.preventDefault();
                    passwordError.style.display = 'block';
                    passwordInput.focus();
                } else {
                    passwordError.hidden = false;
                }
            }

        });

        usernameInput.addEventListener('input', function () {
            usernameError.style.display = 'none';
        });
        passwordInput.addEventListener('input', function () {
            passwordError.style.display = 'none';
        });
    </script>
    <?php
}

function display_secured_content()
{
    global $conn;
    ?>
    <div id="head">
        <h1>3322 Royalty Free Music</h1>
        <p>(Source:<i><a href="https://www.chosic.com/free-music/all/.">https://www.chosic.com/free-music/all/</a></i>)</p>
    </div>
    <div id="Searching">
        <label for="Search" id="SearchLable">Search</label>
        <input type="text" id="Search" name="Search" placeholder="Search for genre"><br>
        <button id="btn">Cinematic</button>
        <button id="btn">Games</button>
        <button id="btn">Romantic</button>
        <button id="btn">Study</button>
        <button id="btn">Popular</button>
    </div>
    <div id="TopEight">
      <?php
        $index=1;
        if (isset($_COOKIE['search'])) {
            $searchQuery = $_COOKIE['search'];
            $searchSongsQuery = "SELECT * FROM Music WHERE Tags LIKE '%$searchQuery%' ORDER BY Pcount DESC";
            $searchSongsResult = mysqli_query($conn, $searchSongsQuery);
            ?><h2>All music under <?php echo $searchQuery;?></h2><?php
            if($searchSongsResult -> num_rows > 0){ 
                while ($row = mysqli_fetch_assoc($searchSongsResult)) {
                  $index++;
      
                 ?>
                    <div id="song-card" data-index="<?php echo $index;?>">
                    <?php 
                        if ($row['_id'] === $_GET['musid']) {
                            ?>
                            <img src="pause.png" id="play<?php echo $index;?>" data-musid="<?php echo $row['_id'];?>">
                            <audio id="audio<?php echo $index;?>" preload="none" data-musid="<?php echo $row['_id'];?>"autoplay>
                            <source src="Music/<?php echo $row['Filename'];?>" type="audio/mpeg"  >
                            </audio>
                            <?php
                        } else {
                            ?>
                            <img src="play.png" id="play<?php echo $index;?>" data-musid="<?php echo $row['_id'];?>">
                            <audio id="audio<?php echo $index;?>" preload="none" data-musid="<?php echo $row['_id'];?>">
                            <source src="Music/<?php echo $row['Filename'];?>" type="audio/mpeg"  >
                            </audio>
                            <?php
                        }
                        ?>
                       
                        <div id="song-info">
                          <h2 id="song-title"><?php echo $row['Title'];?></h2>
                          <p id="song-author"><?php echo $row['Artist'];?></p>
                        </div>
                        <p id="song-length"><?php echo $row['Length'];?></p>
                        <div id="imges">
                          <img src="cc4.png" id="cc4">
                          <img src="count.png">
                        </div>
                        <p id="count"><?php echo $row['Pcount'];?></p>
                        <p id="Tags"><?php echo $row['Tags'];?></p>
                    </div>
                    <?php
                }
              }else {
                  echo "<p>No music found under this genre ($searchQuery)</p>";
              }
        }else{
            ?><h2>Top Eight Popular Music</h2><?php
            $Checksongs="SELECT * FROM Music ORDER BY Pcount DESC LIMIT 8";
            $songs=mysqli_query($conn, $Checksongs);
            if($songs){ 
                while ($row = mysqli_fetch_assoc($songs)) {
                    $index++;
        
                   ?>
                      <div id="song-card" data-index="<?php echo $index;?>">
                      <?php 
                          if ($row['_id'] === $_GET['musid']) {
                              ?>
                              <img src="pause.png" id="play<?php echo $index;?>" data-musid="<?php echo $row['_id'];?>">
                              <audio id="audio<?php echo $index;?>" preload="none" data-musid="<?php echo $row['_id'];?>"autoplay>
                              <source src="Music/<?php echo $row['Filename'];?>" type="audio/mpeg"  >
                              </audio>
                              <?php
                          } else {
                              ?>
                              <img src="play.png" id="play<?php echo $index;?>" data-musid="<?php echo $row['_id'];?>">
                              <audio id="audio<?php echo $index;?>" preload="none" data-musid="<?php echo $row['_id'];?> ">
                                <source src="Music/<?php echo $row['Filename'];?>" type="audio/mpeg" >
                                </audio>
                              <?php
                          }
                          ?>
                         
                          <div id="song-info">
                            <h2 id="song-title"><?php echo $row['Title'];?></h2>
                            <p id="song-author"><?php echo $row['Artist'];?></p>
                          </div>
                          <p id="song-length"><?php echo $row['Length'];?></p>
                          <div id="imges">
                            <img src="cc4.png" id="cc4">
                            <img src="count.png">
                          </div>
                          <p id="count"><?php echo $row['Pcount'];?></p>
                          <p id="Tags"><?php echo $row['Tags'];?></p>
                      </div>
                      <?php
                  }
            }
            mysqli_close($conn);
        }
      ?>

    </div>
    <?php
}

function authenticate()
{
    if (isset($_SESSION['username'])) { //if already authenticated
        return true;
    }
    if (isset($_POST['username']) && isset($_POST['password'])) {
        $username = $_POST['username'];
        $password = $_POST['password'];
        global $conn;
        $query = "SELECT * FROM account WHERE username = '$username' AND password = '$password'";
        $result = mysqli_query($conn, $query);
        if (mysqli_num_rows($result) > 0) {
            $_SESSION['username'] = $username;
            $_SESSION['last_activity'] = time();
            session_write_close();
            return true;
        } else {
            return false;
        }
    }
    return false;
}


?>    