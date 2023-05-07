import { useEffect, useRef, useState } from "react"
import { useWindowDimensions, PanResponder, TextInput, TouchableOpacity } from "react-native"
import { Appbar, Button, IconButton, Text, useTheme } from "react-native-paper"
import Animated, { Extrapolation, FadeInDown, FadeOutDown, FlipInEasyX, FlipOutEasyX, ZoomInRotate, interpolate, useAnimatedStyle, useSharedValue, withDecay, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated"
import { manipulateAsync, FlipType, SaveFormat } from 'expo-image-manipulator';
import { captureRef } from "react-native-view-shot"
import { Image } from "expo-image";
import { BackHandler } from "react-native";

function calculateImageSize(screenWidth, screenHeight, imageWidth, imageHeight) {
    const screenRatio = screenHeight / screenWidth;
    const imageRatio = imageHeight / imageWidth;

    let calculatedWidth;
    let calculatedHeight;

    if (screenRatio > imageRatio) {
        calculatedWidth = screenWidth;
        calculatedHeight = screenWidth * imageRatio;
    } else {
        calculatedWidth = screenHeight / imageRatio;
        calculatedHeight = screenHeight;
    }

    return { width: calculatedWidth, height: calculatedHeight }
}

const EditImage = ({ asset, onSubmit, onCancel }) => {

    const theme = useTheme()
    const screenWidth = useWindowDimensions().width
    const screenHeight = useWindowDimensions().height

    const [hasChanges, setHasChanges] = useState(false)
    const [cropVisible, setCropVisible] = useState(false)
    const [image, setImage] = useState(asset)

    const [numberOfTexts, setNumberOfTexts] = useState(0)

    const visibleImageDimentions = calculateImageSize(screenWidth, screenHeight - 128, image.width, image.height)
    const differenceX = screenWidth - visibleImageDimentions.width
    const differenceY = screenHeight - 128 - visibleImageDimentions.height

    const viewRef = useRef()

    const submitChanges = async () => {
        const successImage = await captureRef(viewRef, { format: "jpg", quality: 1 }).then(uri => {
            const newImage = { ...image }
            newImage.uri = uri
            return newImage
        }).catch(error => console.error("Oops, snapshot failed", error))
        onSubmit(successImage)

    }

    const resetAll = () => {
        setImage(asset)
        setHasChanges(false)
    }

    const rotateLeft = async () => {
        const manipResult = await manipulateAsync(
            image.uri,
            [{ rotate: -90 }],
            { compress: 1, format: SaveFormat.JPEG }
        )
        setImage(manipResult)
        setHasChanges(true)
    }

    const rotateRight = async () => {
        const manipResult = await manipulateAsync(
            image.uri,
            [{ rotate: 90 }],
            { compress: 1, format: SaveFormat.JPEG }
        )
        setImage(manipResult)
        setHasChanges(true)
    }

    const showCrop = () => setCropVisible(true)
    const hideCrop = () => setCropVisible(false)

    const onSubmitCrop = (manipResult) => {
        hideCrop()
        setImage(manipResult)
        setHasChanges(true)
    }

    const handleBack = () => {
        onCancel()
        return true
    }

    useEffect(() => {
        const backHander = BackHandler.addEventListener('hardwareBackPress', handleBack)
        return backHander.remove
    }, [])

    const textsArray = new Array(numberOfTexts).fill(null)

    return (
        <Animated.View style={{ height: '100%', width: '100%', backgroundColor: theme.colors.background, position: 'absolute' }} entering={FlipInEasyX} exiting={FlipOutEasyX}>
            <Appbar.Header>
                <Appbar.Action icon='close' onPress={onCancel} />
                <Appbar.Action icon='reload' disabled={!hasChanges} onPress={resetAll} />
                <Appbar.Action icon='rotate-left' onPress={rotateLeft} style={{ marginStart: 'auto' }} />
                <Appbar.Action icon='rotate-right' onPress={rotateRight} />
                <Appbar.Action icon='scissors-cutting' onPress={showCrop} />
                <Appbar.Action icon='check' disabled={!hasChanges} onPress={submitChanges} />
            </Appbar.Header>
            <Animated.View style={[{ flex: 1 }]}>
                <Animated.View ref={viewRef} style={{ width: visibleImageDimentions.width, height: visibleImageDimentions.height, left: differenceX / 2, top: differenceY / 2 }}>
                    <Image source={image.uri} style={{ flex: 1 }} contentFit='contain' transition={0} />
                    {textsArray.map((e, i) => <TextSticker key={i} imageWidth={screenWidth - differenceX} imageHeight={screenHeight - differenceY} />)}
                </Animated.View>
            </Animated.View>
            <Appbar.Header>
                <Appbar.Action icon='sticker-emoji' onPress={() => { }} />
                <Appbar.Action icon='sticker-text' onPress={() => setNumberOfTexts(numberOfTexts + 1)} />
            </Appbar.Header>
            {cropVisible ? <CropImage asset={image} onSubmit={onSubmitCrop} onCancel={hideCrop} /> : null}
        </Animated.View>
    )
}

const TextSticker = ({ imageWidth, imageHeight }) => {

    const screenWidth = useWindowDimensions().width
    const screenHeight = useWindowDimensions().height

    const XVal = useSharedValue(screenWidth / 2)
    const YVal = useSharedValue(screenHeight / 2)
    const rotateVal = useSharedValue(0)
    const scaleVal = useSharedValue(1)

    const textInputRef = useRef()

    const [editVisible, setEditVisible] = useState(false)
    const [text, setText] = useState('Hejcia')

    let last_x = 0, last_y = 0, last_angle = 0, last_current_angle = 0, double_touch = false

    const panResponder = useRef(PanResponder.create({
        onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dx) >= 1 || Math.abs(gestureState.dy) >= 1
        ,
        onPanResponderGrant: (evt, gestureState) => {
            last_x = XVal.value
            last_y = YVal.value
            last_angle = rotateVal.value
        },
        onPanResponderMove: (evt, gestureState) => {
            //console.log("I was moved")

            if (evt.nativeEvent.touches.length == 2) {

                const touches = evt.nativeEvent.touches

                const angle = Math.atan2(touches[1].locationY - touches[0].locationY, touches[1].locationX - touches[0].locationX)
                const distance = Math.sqrt(Math.pow(touches[1].locationY - touches[0].locationY, 2) + Math.pow(touches[1].locationX - touches[0].locationX, 2))
                scaleVal.value = withSpring(distance / 100, { damping: 10, mass: 0.5 })

                if (!double_touch) {
                    last_current_angle = angle
                    double_touch = true
                    return
                }

                console.log('Angle:', angle, rotateVal.value)
                const diff = last_current_angle - angle

                rotateVal.value = last_angle - diff
                double_touch = true
            }
            else double_touch = false

            XVal.value = withSpring(last_x + gestureState.dx, { mass: 0.5 })
            YVal.value = withSpring(last_y + gestureState.dy, { mass: 0.5 })

        },
        onPanResponderTerminationRequest: (evt, gestureState) => true,
        onShouldBlockNativeResponder: (evt, gestureState) => true
    })).current
    const textAnimatedStyles = useAnimatedStyle(() => {
        return {
            left: XVal.value,
            top: YVal.value,
            transform: [{ rotateZ: `${rotateVal.value}rad` }, { scale: scaleVal.value }]
        }
    })

    const onShow = () => setEditVisible(true)
    const onHide = () => setEditVisible(false)

    return (
        <>
            <Animated.View {...panResponder.panHandlers} style={[textAnimatedStyles, { position: 'absolute', maxWidth: screenWidth / 2 }]}>
                <TouchableOpacity activeOpacity={1} onPress={onShow}>
                    <Animated.Text style={{ color: '#fff', fontSize: 24, textAlign: 'center' }}>
                        {text}
                    </Animated.Text>
                </TouchableOpacity>
            </Animated.View>
            {editVisible ? <TouchableOpacity onPress={onHide} style={{ position: 'absolute', backgroundColor: 'rgba(0,0,0,0.5)', width: '100%', height: '100%' }}>
                <TextInput value={text} multiline ref={textInputRef} autoFocus onChangeText={setText} style={{ color: '#fff', fontSize: 24, textAlign: 'center', top: imageHeight / 8 }} />
            </TouchableOpacity>
                : null}
            {editVisible ? <Button style={{ position: 'absolute', right: 0 }} onPress={onHide}>Gotowe</Button> : null}
        </>
    )
}

const CropImage = ({ asset, onSubmit, onCancel }) => {

    const theme = useTheme()

    const screenWidth = useWindowDimensions().width
    const screenHeight = useWindowDimensions().height

    const visibleImageDimentions = calculateImageSize(screenWidth, screenHeight - 128, asset.width, asset.height)
    const differenceX = screenWidth - visibleImageDimentions.width
    const differenceY = screenHeight - 128 - visibleImageDimentions.height

    console.log(differenceX, differenceY, visibleImageDimentions, screenWidth, screenHeight)

    const cropOriginXVal = useSharedValue(differenceX / 2)
    const cropOriginYVal = useSharedValue(64 + differenceY / 2)
    const cropWidthVal = useSharedValue(screenWidth - differenceX)
    const cropHeightVal = useSharedValue((screenHeight - 128) - differenceY)

    const cropRightVal = useSharedValue(differenceX / 2)
    const cropBottomVal = useSharedValue(64 + differenceY / 2)

    const resetValues = () => {
        cropOriginXVal.value = differenceX / 2
        cropOriginYVal.value = 64 + differenceY / 2
        cropWidthVal.value = screenWidth - differenceX
        cropHeightVal.value = (screenHeight - 128) - differenceY
        cropRightVal.value = differenceX / 2
        cropBottomVal.value = 64 + differenceY / 2
    }

    const crop = async () => {

        const cropOriginXPercent = interpolate(cropOriginXVal.value, [differenceX / 2, screenWidth - differenceX], [0, asset.width], { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.CLAMP })
        const cropOriginYPercent = interpolate(cropOriginYVal.value, [64 + (differenceY / 2), screenHeight - 64 - (differenceY / 2)], [0, asset.height], { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.CLAMP })
        const cropWidthPercent = interpolate(cropWidthVal.value, [differenceX / 2, screenWidth - differenceX], [0, asset.width], { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.CLAMP })
        const cropHeightPercent = interpolate(cropHeightVal.value, [0, screenHeight - 128 - differenceY], [0, asset.height], { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.CLAMP })
        console.log('OriginX:', cropOriginXPercent, 'OriginY:', cropOriginYPercent, 'CropWidth:', cropWidthPercent, 'CropHeight:', cropHeightPercent, `Image: ${asset.width}x${asset.height}`)
        console.log('Total X:', cropOriginXPercent + cropWidthPercent, 'total Y:', cropOriginYPercent + cropHeightPercent)
        if (cropOriginXPercent + cropWidthPercent > asset.width || cropOriginYPercent + cropHeightPercent > asset.height || !cropWidthPercent || !cropHeightPercent) return console.warn('Wrong size!')
        const manipResult = await manipulateAsync(
            asset.uri, [{
                crop: {
                    height: cropHeightPercent,
                    originX: cropOriginXPercent,
                    originY: cropOriginYPercent,
                    width: cropWidthPercent
                }
            }], { compress: 1, format: SaveFormat.PNG })
        onSubmit(manipResult)
    }

    const panResponderTopLeft = PanResponder.create({
        onStartShouldSetPanResponder: (evt, gestureState) => true,
        onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
        onMoveShouldSetPanResponder: (evt, gestureState) => true,
        onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
        onPanResponderMove: (evt, gestureState) => {
            cropOriginXVal.value = gestureState.moveX > differenceX / 2 ? gestureState.moveX : differenceX / 2
            cropOriginYVal.value = gestureState.moveY > 64 + differenceY / 2 ? gestureState.moveY : 64 + differenceY / 2
            cropWidthVal.value = gestureState.moveX > differenceX / 2 ? (screenWidth - gestureState.moveX) - cropRightVal.value : (screenWidth - differenceX / 2) - cropRightVal.value
            cropHeightVal.value = gestureState.moveY > 64 + differenceY / 2 ? (screenHeight - gestureState.moveY) - cropBottomVal.value : (screenHeight - (64 + differenceY / 2)) - cropBottomVal.value
        },
        onPanResponderTerminationRequest: (evt, gestureState) => true,
        onShouldBlockNativeResponder: (evt, gestureState) => true
    })

    const panResponderTopRight = PanResponder.create({
        onStartShouldSetPanResponder: (evt, gestureState) => true,
        onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
        onMoveShouldSetPanResponder: (evt, gestureState) => true,
        onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
        onPanResponderMove: (evt, gestureState) => {
            cropOriginYVal.value = gestureState.moveY > 64 + differenceY / 2 ? gestureState.moveY : 64 + differenceY / 2
            cropWidthVal.value = gestureState.moveX < screenWidth - differenceX / 2 ? (screenWidth - cropOriginXVal.value) - (screenWidth - gestureState.moveX) : (screenWidth - cropOriginXVal.value) - (screenWidth - (screenWidth - differenceX / 2))
            cropHeightVal.value = gestureState.moveY > 64 + differenceY / 2 ? (screenHeight - gestureState.moveY) - cropBottomVal.value : (screenHeight - (64 + differenceY / 2)) - cropBottomVal.value

            cropRightVal.value = gestureState.moveX < screenWidth - differenceX / 2 ? (screenWidth - gestureState.moveX) : (screenWidth - (screenWidth - differenceX / 2))
        },
        onPanResponderTerminationRequest: (evt, gestureState) => true,
        onShouldBlockNativeResponder: (evt, gestureState) => true
    })

    const panResponderBottomLeft = PanResponder.create({
        onStartShouldSetPanResponder: (evt, gestureState) => true,
        onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
        onMoveShouldSetPanResponder: (evt, gestureState) => true,
        onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
        onPanResponderMove: (evt, gestureState) => {
            cropOriginXVal.value = gestureState.moveX > differenceX / 2 ? gestureState.moveX : differenceX / 2
            cropWidthVal.value = gestureState.moveX > differenceX / 2 ? (screenWidth - gestureState.moveX) - cropRightVal.value : (screenWidth - differenceX / 2) - cropRightVal.value
            cropHeightVal.value = gestureState.moveY < screenHeight - 64 - differenceY / 2 ? (screenHeight - cropOriginYVal.value) - (screenHeight - gestureState.moveY) : (screenHeight - cropOriginYVal.value) - (screenHeight - (screenHeight - 64 - differenceY / 2))
            cropBottomVal.value = gestureState.moveY < screenHeight - 64 - differenceY / 2 ? (screenHeight - gestureState.moveY) : (screenHeight - (screenHeight - 64 - differenceY / 2))
        },
        onPanResponderTerminationRequest: (evt, gestureState) => true,
        onShouldBlockNativeResponder: (evt, gestureState) => true
    })

    const panResponderBottomRight = PanResponder.create({
        onStartShouldSetPanResponder: (evt, gestureState) => true,
        onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
        onMoveShouldSetPanResponder: (evt, gestureState) => true,
        onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
        onPanResponderMove: (evt, gestureState) => {

            cropWidthVal.value = gestureState.moveX < screenWidth - differenceX / 2 ? (screenWidth - cropOriginXVal.value) - (screenWidth - gestureState.moveX) : (screenWidth - cropOriginXVal.value) - (screenWidth - (screenWidth - differenceX / 2))
            cropHeightVal.value = gestureState.moveY < screenHeight - 64 - differenceY / 2 ? (screenHeight - cropOriginYVal.value) - (screenHeight - gestureState.moveY) : (screenHeight - cropOriginYVal.value) - (screenHeight - (screenHeight - 64 - differenceY / 2))

            cropRightVal.value = gestureState.moveX < screenWidth - differenceX / 2 ? (screenWidth - gestureState.moveX) : (screenWidth - (screenWidth - differenceX / 2))
            cropBottomVal.value = gestureState.moveY < screenHeight - 64 - differenceY / 2 ? (screenHeight - gestureState.moveY) : (screenHeight - (screenHeight - 64 - differenceY / 2))
        },
        onPanResponderTerminationRequest: (evt, gestureState) => true,
        onShouldBlockNativeResponder: (evt, gestureState) => true
    })
    const cropTopLeftAnimatedStyle = useAnimatedStyle(() => {
        return {
            left: cropOriginXVal.value,
            top: cropOriginYVal.value,
            width: cropWidthVal.value,
            height: cropHeightVal.value
        }
    })

    return (
        <Animated.View style={{ height: '100%', width: '100%', backgroundColor: theme.colors.background, position: 'absolute' }} entering={FadeInDown} exiting={FadeOutDown}>
            <Appbar.Header>
                <Appbar.Action icon='close' onPress={onCancel} />
                <Appbar.Action icon='reload' onPress={resetValues} />
                <Appbar.Action icon='content-cut' style={{ marginStart: 'auto' }} onPress={crop} />
            </Appbar.Header>
            <Animated.View style={{ flex: 1 }}>
                <Animated.Image source={{ uri: asset.uri }} style={{ flex: 1, resizeMode: 'contain' }} />
            </Animated.View>
            <Animated.View style={[cropTopLeftAnimatedStyle, { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.0)' }]}>
                <Animated.View {...panResponderTopLeft.panHandlers} style={{ borderColor: '#fff', borderLeftWidth: 4, borderTopWidth: 4, width: 32, height: 32, position: 'absolute' }} />
                <Animated.View {...panResponderTopRight.panHandlers} style={{ borderColor: '#fff', borderRightWidth: 4, borderTopWidth: 4, width: 32, height: 32, right: 0, position: 'absolute' }} />
                <Animated.View {...panResponderBottomLeft.panHandlers} style={{ borderColor: '#fff', borderLeftWidth: 4, borderBottomWidth: 4, width: 32, height: 32, bottom: 0, position: 'absolute' }} />
                <Animated.View {...panResponderBottomRight.panHandlers} style={{ borderColor: '#fff', borderRightWidth: 4, borderBottomWidth: 4, width: 32, height: 32, bottom: 0, right: 0, position: 'absolute' }} />
                <Animated.View style={{ borderWidth: 0.75, borderColor: 'white', height: '100%', position: 'absolute' }} />
                <Animated.View style={{ borderWidth: 0.75, borderColor: 'white', height: '100%', position: 'absolute', right: 0 }} />
                <Animated.View style={{ borderWidth: 0.75, borderColor: 'white', width: '100%', position: 'absolute', top: 0 }} />
                <Animated.View style={{ borderWidth: 0.75, borderColor: 'white', width: '100%', position: 'absolute', bottom: 0 }} />
            </Animated.View>
            <Appbar.Header>
                <Appbar.Action icon='format-vertical-align-center' onPress={() => { }} />
                <Appbar.Action icon='format-horizontal-align-center' onPress={() => { }} />
                <Appbar.Action icon='crop-square' style={{ marginStart: 'auto' }} onPress={() => { }} />
                <Appbar.Action icon='rectangle-outline' onPress={() => { }} />
            </Appbar.Header>

        </Animated.View>
    )
}

export default EditImage