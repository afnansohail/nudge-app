import { parseNoteLines } from '@/lib/notes';
import { useRef, useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';

type NoteEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function NoteEditor({
  value,
  onChange,
  placeholder = 'Add a note, if it helps…',
}: NoteEditorProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  return (
    <View className="mt-1.5">
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        multiline
        placeholder={placeholder}
        placeholderTextColor="#C0B8AB"
        textAlignVertical="top"
        className="font-display text-[13.5px] text-muted dark:text-muted-dark"
        style={focused ? undefined : { opacity: 0 }}
      />
      {!focused && (
        <Pressable
          onPress={() => inputRef.current?.focus()}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {value.length === 0 ? (
            <Text className="font-display text-[13.5px] text-muted dark:text-muted-dark">
              {placeholder}
            </Text>
          ) : (
            <View className="gap-0.5">
              {parseNoteLines(value).map((segments, index) => (
                <Text
                  key={index}
                  className="font-display text-[13.5px] text-muted dark:text-muted-dark"
                >
                  {segments.map((segment, segmentIndex) =>
                    segment.type === 'link' ? (
                      <Text
                        key={segmentIndex}
                        suppressHighlighting
                        onPress={() => Linking.openURL(segment.url)}
                        className="text-accent underline dark:text-accent-dark"
                      >
                        {segment.value}
                      </Text>
                    ) : (
                      <Text key={segmentIndex}>{segment.value}</Text>
                    )
                  )}
                </Text>
              ))}
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
}
