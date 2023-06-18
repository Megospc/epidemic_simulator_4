var recorded = [ 0x4d, 0x45, 0x83, 0x82 ];
var last_record = 0;

function record_byte(a) {
  recorded.push(a%256);
}
function record_int(a) {
  record_byte(Math.floor(a/256));
  record_byte(a%256);
}

function download_record() {
  let u8 = new Uint8Array(recorded.length);
  for (let i = 0; i < recorded.length; i++) u8[i] = recorded[i];
  let blob = new Blob([u8], { type: "application/octet-stream" });
  let a = document.createElement('a');
  a.download = `epidemic_simulator_${obj.name}.bin`;
  a.href = URL.createObjectURL(blob);
  a.click();
}