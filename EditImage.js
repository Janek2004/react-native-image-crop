import { useRef, useState } from "react"
import { Image, useWindowDimensions, PanResponder } from "react-native"
import { Appbar, Text, useTheme } from "react-native-paper"
import Animated, { Extrapolation, FlipInEasyX, interpolate, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import { manipulateAsync, FlipType, SaveFormat } from 'expo-image-manipulator';
import { captureRef } from 'react-native-view-shot';

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

    const visibleImageDimentions = calculateImageSize(screenWidth, screenHeight - 128, asset.width, asset.height)
    const differenceX = screenWidth - visibleImageDimentions.width
    const differenceY = screenHeight - 128 - visibleImageDimentions.height

    console.log(differenceX, differenceY, visibleImageDimentions, screenWidth, screenHeight)

    const [hasChanges, setHasChanges] = useState(false)
    const [cropVisible, setCropVisible] = useState(false)
    const [image, setImage] = useState(asset)

    const rotateVal = useSharedValue(0)

    const cropOriginXVal = useSharedValue(differenceX / 2)
    const cropOriginYVal = useSharedValue(64)
    const cropWidthVal = useSharedValue(screenWidth - differenceX)
    const cropHeightVal = useSharedValue(screenHeight - 128)

    const cropRightVal = useSharedValue(0)
    const cropBottomVal = useSharedValue(64)

    const viewRef = useRef()

    const resetAll = () => {
        setImage(asset)
        setHasChanges(false)
        cropOriginXVal.value = differenceX / 2
        cropOriginYVal.value = 64
        cropWidthVal.value = screenWidth - differenceX
        cropHeightVal.value = screenHeight - 128
        cropRightVal.value = 0
        cropBottomVal.value = 64
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

    const crop = async () => {
        /*const result = await captureRef(viewRef.current, {
            result: 'tmpfile',
            quality: 1,
            format: 'png'
        })
        console.log(result)
        const imgCopy = { ...image }
        imgCopy.uri = result
        setImage(imgCopy)*/

        setImage(asset)

        const cropOriginXPercent = interpolate(cropOriginXVal.value, [differenceX / 2, screenWidth - differenceX], [0, asset.width], { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.CLAMP })
        const cropOriginYPercent = interpolate(cropOriginYVal.value, [64 + (differenceY / 2), screenHeight - 64 - (differenceY / 2)], [0, asset.height], { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.CLAMP })
        const cropWidthPercent = interpolate(cropWidthVal.value, [differenceX / 2, screenWidth - differenceX], [0, asset.width], { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.CLAMP })
        const cropHeightPercent = interpolate(cropHeightVal.value, [0, screenHeight - 128 - differenceY], [0, asset.height], { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.CLAMP })
        console.log('OriginX:', cropOriginXPercent, 'OriginY:', cropOriginYPercent, 'CropWidth:', cropWidthPercent, 'CropHeight:', cropHeightPercent, `Image: ${asset.width}x${asset.height}`)
        console.log('Total X:', cropOriginXPercent + cropWidthPercent, 'total Y:', cropOriginYPercent + cropHeightPercent)
        if (cropOriginXPercent + cropWidthPercent > asset.width || cropOriginYPercent + cropHeightPercent > asset.height) return console.warn('Wrong size!')
        const manipResult = await manipulateAsync(
            asset.uri, [{
                crop: {
                    height: cropHeightPercent,
                    originX: cropOriginXPercent,
                    originY: cropOriginYPercent,
                    width: cropWidthPercent
                }
            }], { compress: 1, format: SaveFormat.PNG })
        setImage(manipResult)
        setHasChanges(true)
    }

    const showCrop = () => {
        setCropVisible(true)
    }

    const panResponderTopLeft = PanResponder.create({
        onStartShouldSetPanResponder: (evt, gestureState) => true,
        onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
        onMoveShouldSetPanResponder: (evt, gestureState) => true,
        onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
        onPanResponderMove: (evt, gestureState) => {
            console.log('TOP-LEFT MoveX:', cropOriginXVal.value, 'image width:', screenWidth - differenceX / 2)
            cropOriginXVal.value = gestureState.moveX > differenceX / 2 ? gestureState.moveX : differenceX / 2
            cropOriginYVal.value = gestureState.moveY > 64 + differenceY / 2 ? gestureState.moveY : 64 + differenceY / 2
            cropWidthVal.value = gestureState.moveX > differenceX / 2 ? (screenWidth - gestureState.moveX) - cropRightVal.value : (screenWidth - differenceX / 2) - cropRightVal.value
            cropHeightVal.value = gestureState.moveY > 64 + differenceY / 2 ? (screenHeight - gestureState.moveY) - cropBottomVal.value : (screenHeight - 64 + differenceY / 2) - cropBottomVal.value
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
            cropHeightVal.value = gestureState.moveY > 64 + differenceY / 2 ? (screenHeight - gestureState.moveY) - cropBottomVal.value : (screenHeight - 64 + differenceY / 2) - cropBottomVal.value

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

    const imageViewAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${rotateVal.value}deg` }]
        }
    })

    return (
        <Animated.View style={{ height: '100%', width: '100%', backgroundColor: theme.colors.background, position: 'absolute' }} entering={FlipInEasyX}>
            <Appbar.Header>
                <Appbar.Action icon='close' onPress={onCancel} />
                <Appbar.Action icon='reload' disabled={!hasChanges} onPress={resetAll} />
                <Appbar.Action icon='rotate-left' onPress={rotateLeft} style={{ marginStart: 'auto' }} />
                <Appbar.Action icon='rotate-right' onPress={rotateRight} />
                <Appbar.Action icon='crop-free' onPress={crop} />
                <Appbar.Action icon='check' disabled={!hasChanges} onPress={onCancel} />
            </Appbar.Header>
            <Animated.View style={[{ flex: 1 }]}>
                <Animated.Image onLayout={e => console.warn(e.nativeEvent)} ref={viewRef} source={{ uri: image.uri }} style={{ flex: 1, resizeMode: 'contain' }} />
            </Animated.View>
            <Animated.View style={[cropTopLeftAnimatedStyle, { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.0)' }]}>
                <Animated.View {...panResponderTopLeft.panHandlers} style={{ borderColor: '#fff', borderLeftWidth: 6, borderTopWidth: 6, width: 32, height: 32, position: 'absolute' }} />
                <Animated.View {...panResponderTopRight.panHandlers} style={{ borderColor: '#fff', borderRightWidth: 6, borderTopWidth: 6, width: 32, height: 32, right: 0, position: 'absolute' }} />
                <Animated.View {...panResponderBottomLeft.panHandlers} style={{ borderColor: '#fff', borderLeftWidth: 6, borderBottomWidth: 6, width: 32, height: 32, bottom: 0, position: 'absolute' }} />
                <Animated.View {...panResponderBottomRight.panHandlers} style={{ borderColor: '#fff', borderRightWidth: 6, borderBottomWidth: 6, width: 32, height: 32, bottom: 0, right: 0, position: 'absolute' }} />
                <Animated.View style={{ borderWidth: 1, borderColor: 'white', width: 1, height: '100%', position: 'absolute' }} />
                <Animated.View style={{ borderWidth: 1, borderColor: 'white', width: 1, height: '100%', position: 'absolute', right: 0 }} />
                <Animated.View style={{ borderWidth: 1, borderColor: 'white', width: '100%', height: 1, position: 'absolute', top: 0 }} />
                <Animated.View style={{ borderWidth: 1, borderColor: 'white', width: '100%', height: 1, position: 'absolute', bottom: 0 }} />
            </Animated.View>
            <Appbar.Header>
                <Appbar.Action icon='sticker' onPress={() => { }} />
            </Appbar.Header>
        </Animated.View>
    )
}

/*
const TestCrop = () => (
    <Animated.View style={[cropTopLeftAnimatedStyle, { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.0)' }]}>
        <Animated.View {...panResponderTopLeft.panHandlers} style={{ borderColor: '#fff', borderLeftWidth: 6, borderTopWidth: 6, width: 32, height: 32, position: 'absolute' }} />
        <Animated.View {...panResponderTopRight.panHandlers} style={{ borderColor: '#fff', borderRightWidth: 6, borderTopWidth: 6, width: 32, height: 32, right: 0, position: 'absolute' }} />
        <Animated.View {...panResponderBottomLeft.panHandlers} style={{ borderColor: '#fff', borderLeftWidth: 6, borderBottomWidth: 6, width: 32, height: 32, bottom: 0, position: 'absolute' }} />
        <Animated.View {...panResponderBottomRight.panHandlers} style={{ borderColor: '#fff', borderRightWidth: 6, borderBottomWidth: 6, width: 32, height: 32, bottom: 0, right: 0, position: 'absolute' }} />
        <Animated.View style={{ borderWidth: 1, borderColor: 'white', width: 1, height: '100%', position: 'absolute' }} />
        <Animated.View style={{ borderWidth: 1, borderColor: 'white', width: 1, height: '100%', position: 'absolute', right: 0 }} />
        <Animated.View style={{ borderWidth: 1, borderColor: 'white', width: '100%', height: 1, position: 'absolute', top: 0 }} />
        <Animated.View style={{ borderWidth: 1, borderColor: 'white', width: '100%', height: 1, position: 'absolute', bottom: 0 }} />
    </Animated.View>
)*/

export default EditImage