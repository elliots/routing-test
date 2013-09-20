Routing
------

When actuating...

 - We look up our list of current routes (blocks)
 - Select one (by device 'distance' (e.g. ping) if possible)
 - Send the actuation down to the block

   - If the block does not acknowledge receipt of the message, we 'demote' it and try another block if available.
   - If the block does not acknowledge delivery of the message, ???


### MQTT Topics Used

REST API/Anything else actuating ➡ Controller

    $client/device/DEVICEID/actuate

Controller ➡ Driver

    $client/block/BLOCKID/device/DEVICEID/actuate

Driver ➡ Controller

    $client/block/BLOCKID/device/DEVICEID/actuate/reply

Controller ➡ REST API/Anything else actuating

    $client/device/DEVICEID/actuate/reply
