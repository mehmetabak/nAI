import Swal from 'sweetalert2';

export const showPatchNotesModal = (patchNotes) => {
  Swal.fire({
    title: 'Patch Notes',
    html: patchNotes,
    icon: 'info',
    confirmButtonText: 'Close',
    width: '90%',
  });
};
