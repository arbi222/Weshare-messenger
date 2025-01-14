const playSound = (audioName, loop) => {
    const audio = new Audio(audioName);
    if (loop === true){
        audio.loop = true;
    }
    audio.play().catch(err => {
        console.log(err);
    });
    return audio;
};

export default playSound;