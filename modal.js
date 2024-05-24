import Swal from 'sweetalert2';

//There is an error in this library, check it before use

export const showPatchNotesModal = (patchNotes) => {
  Swal.fire({
    title: 'Patch Notes',
    html: patchNotes,
    icon: 'info',
    confirmButtonText: 'Close',
    width: '90%',
  });
};
