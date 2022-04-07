import uploadPlaceholderPlugin, {
  findPlaceholder,
} from "../lib/uploadPlaceholder";
import isVideo from "../queries/isVideo";
import { ToastType } from "../types";

const insertFiles = function(view, event, pos, files, options) {
  // filter to only include image files
  const images = files.filter((file) => /image/i.test(file.type));
  const videos = files.filter((file) => /video/i.test(file.type));
  if (images.length === 0 && videos.length === 0) return;

  const {
    dictionary,
    uploadMedia,
    onImageUploadStart,
    onImageUploadStop,
    onShowToast,
  } = options;

  if (!uploadMedia) {
    console.warn(
      "uploadMedia callback must be defined to handle image uploads."
    );
    return;
  }

  // okay, we have some dropped images and a handler – lets stop this
  // event going any further up the stack
  event.preventDefault();

  // let the user know we're starting to process the images
  if (onImageUploadStart) onImageUploadStart();

  const { schema } = view.state;

  // we'll use this to track of how many images have succeeded or failed
  let complete = 0;

  const validFile = !!videos.length ? videos : images;
  // the user might have dropped multiple images at once, we need to loop
  for (const file of validFile) {
    // Use an object to act as the ID for this upload, clever.
    const id = {};

    const { tr } = view.state;
    // insert a placeholder at this position
    tr.setMeta(uploadPlaceholderPlugin, {
      add: { id, file, pos },
    });
    view.dispatch(tr);

    // start uploading the image file to the server. Using "then" syntax
    // to allow all placeholders to be entered at once with the uploads
    // happening in the background in parallel.
    uploadMedia(file)
      .then((src) => {
        const isFileVideo = isVideo(src);

        // otherwise, insert it at the placeholder's position, and remove
        // the placeholder itself
        const newFile = isFileVideo
          ? document.createElement("video")
          : new Image();

        const initFileLoad = () => {
          const pos = findPlaceholder(view.state, id);

          // if the content around the placeholder has been deleted
          // then forget about inserting this image
          if (pos === null) return;

          const transaction = view.state.tr
            .replaceWith(pos, pos, schema.nodes.image.create({ src }))
            .setMeta(uploadPlaceholderPlugin, { remove: { id } });

          view.dispatch(transaction);
        };

        // If uploaded file is Video
        if (isFileVideo) {
          initFileLoad();
          newFile.setAttribute("src", src);
          newFile.setAttribute("controls", "controls");
        }
        // If uploaded file is Image
        else {
          newFile.onload = initFileLoad;

          newFile.onerror = (error) => {
            throw error;
          };

          newFile.src = src;
        }
      })
      .catch((error) => {
        console.error(error);

        // cleanup the placeholder if there is a failure
        const transaction = view.state.tr.setMeta(uploadPlaceholderPlugin, {
          remove: { id },
        });
        view.dispatch(transaction);

        // let the user know
        if (onShowToast) {
          onShowToast(dictionary.mediaUploadError, ToastType.Error);
        }
      })
      // eslint-disable-next-line no-loop-func
      .finally(() => {
        complete++;

        // once everything is done, let the user know
        if (complete === images.length && onImageUploadStop) {
          onImageUploadStop();
        }
      });
  }
};

export default insertFiles;
