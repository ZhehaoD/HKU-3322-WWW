<?php
  
  define("DB_HOST", "mydb");
  define("USERNAME", "dummy");
  define("PASSWORD", "c3322b");
  define("DB_NAME", "db3322");
  $conn=mysqli_connect(DB_HOST, USERNAME, PASSWORD, DB_NAME) or die('Error! '. mysqli_connect_error($conn));

  
  if($_POST['show'] =='add') {
    // add code here
    while($row = mysqli_fetch_array($result)) {
      print "<div id=".$row['id'].">";
      print "<span>"."</span>";
      print "</div>";
    }
  } elseif ($_POST['show'] == 'all') {
    $query = 'select * from attendancelist';
    $result = mysqli_query($conn, $query) or die ('Failed to query '.mysqli_error($conn));
    while($row = mysqli_fetch_array($result)) {
      print "<div id=".$row['id'].">";
      print "<span>"."</span>";
      print "</div>";
    }
    
  } elseif ($_POST['show'] == 'major') {
    // add code here
  } elseif ($_POST['show'] == 'course') {
    // add code here
  }
  mysqli_free_result($result);
  mysqli_close($conn);    
  

?>